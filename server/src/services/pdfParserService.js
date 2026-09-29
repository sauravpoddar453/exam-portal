const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const https = require('https');
const Setting = require('../models/Setting');

/**
 * Safe Page Renderer for pdf-parse to prevent page-level font/stream crashes
 */
function safePdfPageRender(pageData) {
  return pageData
    .getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false })
    .then((textContent) => {
      let lastY, text = '';
      for (let item of textContent.items) {
        if (!item || !item.str) continue;
        if (lastY == item.transform[4] || !lastY) {
          text += ' ' + item.str;
        } else {
          text += '\n' + item.str;
        }
        lastY = item.transform[4];
      }
      return text;
    })
    .catch((err) => {
      console.warn('[pdfParserService] Page render warning:', err.message);
      return '';
    });
}

/**
 * Extract raw text from PDF Buffer using pdf-parse with fallback handling
 */
async function extractTextFromPdf(pdfBuffer) {
  Setting.incrementKey('pdfParseCount').catch(e => console.error(e.message));
  let rawText = '';
  let lastError = null;

  try {
    const data = await pdfParse(pdfBuffer);
    if (data && data.text) {
      rawText = data.text.trim();
    }
  } catch (err) {
    console.warn('[pdfParserService] Standard pdf-parse failed, attempting safe page renderer:', err.message);
    lastError = err;
  }

  if (!rawText || rawText.length < 15) {
    try {
      const data = await pdfParse(pdfBuffer, { pagerender: safePdfPageRender });
      if (data && data.text) {
        rawText = data.text.trim();
      }
    } catch (err) {
      console.warn('[pdfParserService] Fallback safe page renderer failed:', err.message);
      lastError = err;
    }
  }

  if (!rawText || rawText.length < 15) {
    const isScannedPdf = !lastError;
    const errorMsg = isScannedPdf
      ? 'This PDF appears to be a scanned image or photo without selectable text. Please convert your file to a Word (.docx) document or text PDF and try uploading.'
      : `Failed to read text from PDF (${lastError ? lastError.message : 'unreadable format'}). Please try converting the file to a Word (.docx) document or text-based PDF.`;
    
    const err = new Error(errorMsg);
    err.statusCode = 400;
    throw err;
  }

  return rawText;
}

/**
 * Convert HTML extracted from Word to clean, line-separated text with layout preservation
 */
function cleanHtmlToText(html) {
  if (!html) return '';
  return html
    .replace(/<\/(p|li|tr|h[1-6]|div)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&deg;/g, '°')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&plusmn;/g, '±')
    .replace(/&times;/g, '×')
    .replace(/&divide;/g, '÷')
    .replace(/\r\n/g, '\n')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * Extract raw text from Word (.docx) Buffer using mammoth with HTML layout preservation
 */
async function extractTextFromDocx(docxBuffer) {
  try {
    let rawText = '';
    
    // Attempt 1: Convert to HTML to preserve paragraph (<p>), list (<li>), and table (<tr>) linebreaks
    try {
      const htmlResult = await mammoth.convertToHtml({ buffer: docxBuffer });
      if (htmlResult && htmlResult.value) {
        rawText = cleanHtmlToText(htmlResult.value);
      }
    } catch (htmlErr) {
      console.warn('[pdfParserService] Mammoth convertToHtml failed, trying extractRawText:', htmlErr.message);
    }

    // Attempt 2: Fallback to extractRawText if HTML conversion returned empty text
    if (!rawText || rawText.length < 10) {
      const result = await mammoth.extractRawText({ buffer: docxBuffer });
      rawText = result.value ? result.value.trim() : '';
    }

    console.log('====================================================');
    console.log('[MAMMOTH_EXTRACTED_TEXT] FULL extracted text from Word (.docx) (first 3000 chars):');
    console.log(rawText.substring(0, 3000));
    console.log('[MAMMOTH_EXTRACTED_TEXT] Total characters extracted:', rawText.length);
    console.log('====================================================');

    if (!rawText || rawText.length < 10) {
      const err = new Error(
        'The Word document appears to be empty or contains no readable text.'
      );
      err.statusCode = 400;
      throw err;
    }

    return rawText;
  } catch (error) {
    if (error.statusCode) throw error;
    console.error('[pdfParserService] mammoth docx error:', error);
    const err = new Error('Failed to extract text from Word (.docx) document.');
    err.statusCode = 400;
    throw err;
  }
}

/**
 * Detect if text matches Fixed Template format
 */
function isFixedTemplateFormat(rawText) {
  const hasQMarker = /Q\s*:|QUESTION\s*:/i.test(rawText);
  const hasTypeMarker = /TYPE\s*:/i.test(rawText);
  const hasAnswerMarker = /ANSWER\s*:/i.test(rawText);

  return hasQMarker && (hasTypeMarker || hasAnswerMarker || rawText.includes('---'));
}

/**
 * Path A: Parse Fixed Template text
 */
function parseFixedTemplate(rawText) {
  const text = rawText.replace(/\r\n/g, '\n');
  let blocks = text.split(/---|(?=\n\s*Q\s*:)/i);
  const parsedQuestions = [];

  for (let block of blocks) {
    block = block.trim();
    if (!block) continue;

    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    let questionText = '';
    let typeRaw = 'MCQ';
    let options = [];
    let correctAnswer = '';
    let marks = 1;
    let negativeMarks = 0;
    let difficulty = 'medium';
    let subject = 'General';
    let explanation = '';
    let sectionTopic = 'General';

    for (const line of lines) {
      if (/^Q\s*:/i.test(line)) {
        questionText = line.replace(/^Q\s*:/i, '').trim();
      } else if (/^TYPE\s*:/i.test(line)) {
        typeRaw = line.replace(/^TYPE\s*:/i, '').trim().toUpperCase();
      } else if (/^[A-D][\)\.]\s*/i.test(line)) {
        const optionText = line.replace(/^[A-D][\)\.]\s*/i, '').trim();
        options.push(optionText);
      } else if (/^ANSWER\s*:/i.test(line)) {
        correctAnswer = line.replace(/^ANSWER\s*:/i, '').trim();
      } else if (/^EXPLANATION\s*:/i.test(line)) {
        explanation = line.replace(/^EXPLANATION\s*:/i, '').trim();
      } else if (/^TOPIC\s*:|^SECTION\s*:/i.test(line)) {
        sectionTopic = line.replace(/^TOPIC\s*:|^SECTION\s*:/i, '').trim();
      } else if (/^MARKS\s*:/i.test(line)) {
        const parsedMarks = parseFloat(line.replace(/^MARKS\s*:/i, '').trim());
        if (!isNaN(parsedMarks)) marks = parsedMarks;
      } else if (/^NEGATIVE\s*:/i.test(line)) {
        const parsedNeg = parseFloat(line.replace(/^NEGATIVE\s*:/i, '').trim());
        if (!isNaN(parsedNeg)) negativeMarks = parsedNeg;
      } else if (/^DIFFICULTY\s*:/i.test(line)) {
        const diffVal = line.replace(/^DIFFICULTY\s*:/i, '').trim().toLowerCase();
        if (['easy', 'medium', 'hard'].includes(diffVal)) difficulty = diffVal;
      } else if (/^SUBJECT\s*:/i.test(line)) {
        subject = line.replace(/^SUBJECT\s*:/i, '').trim();
      } else if (!questionText) {
        questionText = line;
      }
    }

    if (!questionText) continue;

    let type = 'mcq-single';
    if (typeRaw.includes('TRUE') || typeRaw.includes('TF')) {
      type = 'true-false';
      options = ['True', 'False'];
    } else if (typeRaw.includes('SHORT') || typeRaw.includes('ESSAY')) {
      type = 'short-answer';
      options = [];
    }

    if (type === 'mcq-single' && correctAnswer && options.length > 0) {
      const upperAns = correctAnswer.trim().toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(upperAns)) {
        const index = upperAns.charCodeAt(0) - 65;
        if (options[index]) {
          correctAnswer = options[index];
        }
      }
    }

    parsedQuestions.push({
      questionText,
      type,
      options,
      correctAnswer,
      marks,
      negativeMarks,
      difficulty,
      subject,
      explanation,
      sectionTopic,
    });
  }

  return parsedQuestions;
}

/**
 * Anthropic Claude API Call Helper with complete error reporting
 */
function callClaudeApi(apiKey, promptText, maxTokens = 8192) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: promptText }],
    });

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const responseObj = JSON.parse(data);
            const textContent = responseObj.content?.[0]?.text || '';
            resolve(textContent);
          } catch (err) {
            reject(new Error(`Failed to parse Anthropic API response JSON: ${err.message}`));
          }
        } else {
          reject(new Error(`Anthropic API HTTP Error ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (err) => reject(new Error(`Anthropic API Network Error: ${err.message}`)));
    req.write(payload);
    req.end();
  });
}

/**
 * Helper to clean and extract JSON array from text
 */
function cleanAndExtractJsonArray(str) {
  if (!str) return '[]';
  let s = str.replace(/```json/gi, '').replace(/```/g, '').trim();
  const startIdx = s.indexOf('[');
  const endIdx = s.lastIndexOf(']');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    s = s.substring(startIdx, endIdx + 1);
  }
  return s;
}

/**
 * Path B1: Parse Free-Form PDF via Claude Anthropic API
 */
async function parseFreeFormWithClaude(rawText) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[CLAUDE_API_STATUS] ANTHROPIC_API_KEY is not set in environment variables.');
    throw new Error('ANTHROPIC_API_KEY_NOT_CONFIGURED');
  }

  const buildPrompt = (textChunk) => `You are an expert exam question extractor.
The text below contains exam questions (numbered 1., 2., 3., etc.) and potentially an "Answer Key & Explanations" section at the end.
Also detect any section or topic headings (like "Calendar Problems", "Clock Problems", "Data Interpretation", etc.) above question blocks.

INSTRUCTIONS:
1. Split document into "Questions" region and "Answer Key & Explanations" region.
2. For each question in Questions region:
   - Extract sequential "questionNumber" (integer, e.g. 26).
   - Extract "questionText".
   - Extract 4 options (strip "(A)", "(B)", "A)", "B." labels, keep ONLY option text, preserving special symbols like degree °).
   - Detect "sectionTopic" (heading string if present above this question group, default "General").
3. For Answer Key region:
   - Match by "questionNumber".
   - Extract correct option letter / text as "correctAnswer".
   - Extract 1-2 line explanation text as "explanation" field.
4. If a question's answer is missing in the Answer Key region, set "correctAnswer" to "".

Return ONLY a valid JSON array matching this exact schema without markdown formatting or commentary:
[
  {
    "questionNumber": 26,
    "questionText": "What day of the week was 15th August 1947?",
    "type": "mcq-single",
    "options": ["Friday", "Thursday", "Saturday", "Sunday"],
    "correctAnswer": "Friday",
    "explanation": "15th August 1947 fell on a Friday.",
    "marks": 1,
    "difficulty": "medium",
    "sectionTopic": "Calendar Problems"
  }
]

Text to parse:
${textChunk}`;

  const promptText = buildPrompt(rawText);

  console.log('====================================================');
  console.log('[CLAUDE_SYSTEM_PROMPT_EXACT] Exact prompt sent to Claude API:');
  console.log(promptText.substring(0, 3000));
  console.log('[CLAUDE_PROMPT_LENGTH] Total input prompt length:', promptText.length, 'chars');
  console.log('====================================================');

  let rawAiOutput = '';
  try {
    rawAiOutput = await callClaudeApi(apiKey, promptText, 8192);
    console.log('[CLAUDE_API_STATUS] API call completed successfully.');
  } catch (apiErr) {
    console.error('====================================================');
    console.error('[CLAUDE_API_ERROR] Claude Anthropic API call failed:');
    console.error(apiErr);
    console.error('====================================================');
    throw apiErr;
  }

  console.log('====================================================');
  console.log('[CLAUDE_RAW_RESPONSE_FULL] Complete raw response text from Claude API:');
  console.log(JSON.stringify(rawAiOutput));
  console.log('[CLAUDE_RAW_RESPONSE] Total response characters:', rawAiOutput.length);
  console.log('[CLAUDE_JSON_CLOSED] JSON array properly closed with "]" at end:', rawAiOutput.trim().endsWith(']'));
  console.log('====================================================');

  const cleaned = cleanAndExtractJsonArray(rawAiOutput);

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.length > 0) {
      console.log(`[CLAUDE_JSON_PARSE_SUCCESS] Parsed ${parsed.length} question objects from Claude response.`);
      return parsed;
    }
  } catch (parseErr) {
    console.error('====================================================');
    console.error('[CLAUDE_JSON_PARSE_ERROR] JSON.parse failed on Claude response!');
    console.error('Parse Error Message:', parseErr.message);
    console.error('Exact String That Failed To Parse:');
    console.error(cleaned);
    console.error('====================================================');
    throw new Error(`JSON.parse failed on Claude response: ${parseErr.message}`);
  }

  return [];
}

/**
 * Path B2: Enhanced Free-form Fallback Heuristic Parser
 * Reliably handles un-prefixed raw options, section headers (e.g. Clock Problems (Q1-25)),
 * double-newline block splits, and Answer Key & Explanations matching.
 */
function parseFreeFormHeuristic(rawText) {
  const text = rawText.replace(/\r\n/g, '\n');

  // 1. Separate Questions Region vs Answer Key Region
  const answerKeyMatch = text.match(/\n\s*(?:Answer\s*Key|Answers|Explanations|Solutions|Solution\s*Key)\b/i);
  let questionsSection = text;
  let answerKeySection = '';

  if (answerKeyMatch && answerKeyMatch.index !== undefined) {
    questionsSection = text.substring(0, answerKeyMatch.index);
    answerKeySection = text.substring(answerKeyMatch.index);
  }

  // 2. Parse Answer Key Map (questionNumber -> { ansLetter, ansText, explanation })
  const answerKeyMap = new Map();
  if (answerKeySection) {
    const answerEntries = answerKeySection.split(/(?=\n\s*\d+[\.\)])/);
    for (let entry of answerEntries) {
      entry = entry.trim();
      if (!entry) continue;

      const numMatch = entry.match(/^(?:(\d+)[\.\)]|Q(\d+)[\.\:]|Question\s*(\d+)[\.\:]\s*)/i);
      const qNum = numMatch ? parseInt(numMatch[1] || numMatch[2] || numMatch[3], 10) : null;

      const ansLetterMatch = entry.match(/(?:Answer\s*:|Ans\s*:|Key\s*:)\s*(?:\(([A-Da-d])\)|([A-Da-d])[\)\.\:]?)\s*(.*?)(?:\n|$)/i)
                           || entry.match(/\b([A-Da-d])[\)\.]\s*(.*?)(?:\n|$)/i);
      const ansLetter = ansLetterMatch ? (ansLetterMatch[1] || ansLetterMatch[2] || '').toUpperCase() : '';
      let ansText = ansLetterMatch ? (ansLetterMatch[3] || ansLetterMatch[2] || '').trim() : '';

      let explanation = '';
      const expMatch = entry.match(/(?:Explanation|Solution)\s*:\s*([\s\S]+)/i);
      if (expMatch) {
        explanation = expMatch[1].trim();
      } else {
        const lines = entry.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length > 1) {
          explanation = lines.slice(1).join(' ');
        }
      }

      if (qNum) {
        answerKeyMap.set(qNum, { ansLetter, ansText, explanation });
      }
    }
  }

  // 3. Split Questions Region by candidate blocks (blank lines OR question number boundaries)
  const candidateBlocks = questionsSection.split(/(?:\n\s*\n|(?=\n\s*(?:Q\s*\d*[\.\:\-]|Question\s*\d+[\.\:\-]|\[?\d{1,3}\]?[\.\)\:]\s+)))/i);
  const results = [];
  let currentTopic = 'General';
  let autoQNum = 1;

  for (let block of candidateBlocks) {
    block = block.trim();
    if (!block || block.length < 3) continue;

    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    // Detect Section / Topic Headers (e.g. "Clock Problems (Q1-25)", "Category: Aptitude")
    const isTopicHeader =
      /^(?:Topic|Section|Category|Chapter|Part)\s*:\s*/i.test(lines[0]) ||
      (/\(Q\d+-\d+\)/i.test(lines[0]) && !lines[0].includes('?')) ||
      (lines.length === 1 && !lines[0].includes('?') && !/^(?:\d+[\.\)]|Q\d+[\.\:]|Question\s*\d+[\.\:]\s*)/i.test(lines[0]) && lines[0].length < 70 && !/^(?:\([A-D]\)|[A-D][\)\.])\s*/i.test(lines[0]));

    if (isTopicHeader) {
      const headerText = lines.join(' ').replace(/^(?:Topic|Section|Category|Chapter|Part)\s*:\s*/i, '').trim();
      if (headerText && headerText.length < 80) {
        currentTopic = headerText;
      }
      continue;
    }

    // Question Number & Text Extraction
    const qNumMatch = lines[0].match(/^(?:(\d+)[\.\)]|Q(\d+)[\.\:]|Question\s*(\d+)[\.\:]\s*)/i);
    const qNum = qNumMatch ? parseInt(qNumMatch[1] || qNumMatch[2] || qNumMatch[3], 10) : autoQNum;

    let questionText = lines[0].replace(/^(?:\d+[\.\)]|Q\d+[\.\:]|Question\s*\d+[\.\:]\s*)/i, '').trim();
    let options = [];
    let correctAnswer = '';
    let type = 'mcq-single';

    // A) Inline Options Check: (A) Opt1 (B) Opt2 (C) Opt3 (D) Opt4
    const inlineMatches = [...block.matchAll(/(?:\([A-Da-d]\)|[A-Da-d][\)\.])\s*([^(\n]+?)(?=(?:\([A-Da-d]\)|[A-Da-d][\)\.]|$))/gi)];
    if (inlineMatches.length >= 2) {
      options = inlineMatches.map(m => m[1].trim());
      const optStartIdx = block.search(/(?:\([A-Da-d]\)|[A-Da-d][\)\.])/i);
      if (optStartIdx !== -1) {
        questionText = block.substring(0, optStartIdx).replace(/^(?:\d+[\.\)]|Q\d+[\.\:]|Question\s*\d+[\.\:]\s*)/i, '').trim();
      }
    } else {
      // B) Line-by-Line Options Check (Prefixed A), (A), A. OR Un-prefixed raw 4 lines!)
      const optionPrefixedLines = [];
      const nonOptionLines = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];

        if (/^(?:\([A-Da-d1-4]\)|[A-Da-d1-4][\)\.\:]|\b[A-Da-d]\s*[\:\-])\s*/i.test(line)) {
          const optText = line.replace(/^(?:\([A-Da-d1-4]\)|[A-Da-d1-4][\)\.\:]|\b[A-Da-d]\s*[\:\-])\s*/i, '').trim();
          if (optText) optionPrefixedLines.push(optText);
        } else if (/^Answer\s*:|^Ans\s*:/i.test(line)) {
          correctAnswer = line.replace(/^Answer\s*:|^Ans\s*:/i, '').trim();
        } else {
          nonOptionLines.push(line);
        }
      }

      if (optionPrefixedLines.length >= 2) {
        options = optionPrefixedLines;
        for (const line of nonOptionLines) {
          if (!questionText.includes(line)) {
            questionText += (questionText ? ' ' : '') + line;
          }
        }
      } else if (lines.length === 5) {
        // Raw un-prefixed 4-option block: Line 0 = Question Prompt, Lines 1..4 = Raw Options
        questionText = lines[0].replace(/^(?:\d+[\.\)]|Q\d+[\.\:]|Question\s*\d+[\.\:]\s*)/i, '').trim();
        options = lines.slice(1).map(l => l.trim()).filter(Boolean);
      } else if (lines.length > 2 && nonOptionLines.length >= 2 && (questionText.endsWith('?') || /^(?:what|which|how|why|when|where|find|calculate|evaluate)\b/i.test(lines[0]))) {
        // Un-prefixed raw option lines following question prompt line
        options = nonOptionLines.map(l => l.trim()).filter(Boolean);
      }
    }

    if (!questionText && lines[0]) {
      questionText = lines[0].replace(/^(?:\d+[\.\)]|Q\d+[\.\:]|Question\s*\d+[\.\:]\s*)/i, '').trim();
    }

    if (!questionText || questionText.length < 2) continue;

    // Match with Answer Key Map by qNum
    let explanation = '';
    if (qNum && answerKeyMap.has(qNum)) {
      const kInfo = answerKeyMap.get(qNum);
      if (kInfo.ansText) {
        correctAnswer = kInfo.ansText;
      }
      if (!correctAnswer && kInfo.ansLetter && options.length > 0) {
        const idx = kInfo.ansLetter.charCodeAt(0) - 65;
        if (options[idx]) correctAnswer = options[idx];
      }
      if (kInfo.explanation) {
        explanation = kInfo.explanation;
      }
    }

    if (correctAnswer) {
      correctAnswer = correctAnswer
        .replace(/^Answer\s*:\s*/i, '')
        .replace(/^\([A-Da-d]\)\s*/i, '')
        .replace(/^[A-Da-d][\)\.]\s*/i, '')
        .trim();

      const upper = correctAnswer.toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(upper) && options.length > 0) {
        const idx = upper.charCodeAt(0) - 65;
        if (options[idx]) correctAnswer = options[idx];
      }
    }

    if (/true\s*\/|\s*false/i.test(questionText) || (options.length === 2 && options[0].toLowerCase().includes('true'))) {
      type = 'true-false';
      options = ['True', 'False'];
    } else if (options.length >= 2) {
      type = 'mcq-single';
    } else {
      type = 'short-answer';
    }

    results.push({
      questionNumber: qNum,
      questionText: questionText.trim(),
      type,
      options,
      correctAnswer,
      marks: 1,
      negativeMarks: 0,
      difficulty: 'medium',
      subject: currentTopic || 'General',
      explanation,
      sectionTopic: currentTopic,
    });

    autoQNum++;
  }

  return results;
}

/**
 * Enrich questions with tempId, flags, and warning validations
 */
function enrichAndValidateQuestions(questions) {
  return questions.map((q, index) => {
    const warnings = [];
    const questionText = q.questionText || '';
    const type = q.type || 'mcq-single';
    let options = Array.isArray(q.options) ? q.options : [];
    let correctAnswer = q.correctAnswer !== undefined && q.correctAnswer !== null ? String(q.correctAnswer).trim() : '';
    const sectionTopic = q.sectionTopic || q.subject || 'General';
    const explanation = q.explanation || '';

    if (type === 'true-false') {
      options = ['True', 'False'];
    } else if (type === 'short-answer') {
      options = [];
    }

    if (!questionText || questionText.trim().length < 3) {
      warnings.push('Question text is incomplete or too short.');
    }

    if (type === 'mcq-single') {
      if (options.length < 2) {
        warnings.push('MCQ question has fewer than 2 options.');
      }
      if (!correctAnswer) {
        warnings.push('Missing correct answer from Answer Key section.');
      }
    } else if (type === 'true-false') {
      if (!correctAnswer) {
        warnings.push('Missing True/False correct answer.');
      }
    }

    return {
      tempId: `pdf_q_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`,
      questionNumber: q.questionNumber || index + 1,
      questionText,
      type,
      options,
      correctAnswer,
      explanation,
      sectionTopic,
      marks: typeof q.marks === 'number' && q.marks > 0 ? q.marks : 1,
      negativeMarks: typeof q.negativeMarks === 'number' ? q.negativeMarks : 0,
      difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty?.toLowerCase()) ? q.difficulty.toLowerCase() : 'medium',
      subject: sectionTopic,
      warnings,
      hasWarning: warnings.length > 0,
      isIncluded: true,
    };
  });
}

/**
 * Main PDF Processor Entry Point
 */
async function parsePdfQuestions(pdfBuffer) {
  return await parseDocumentQuestions(pdfBuffer, 'file.pdf', 'application/pdf');
}

/**
 * Main Document Processor Entry Point (PDF & Word .docx)
 */
async function parseDocumentQuestions(buffer, filename = '', mimetype = '') {
  console.log('====================================================');
  console.log(`[FILE_TYPE_DETECTION] Filename: "${filename}", Mimetype: "${mimetype}"`);

  const nameLower = (filename || '').toLowerCase();
  const mimeLower = (mimetype || '').toLowerCase();

  const isDocx =
    nameLower.endsWith('.docx') ||
    nameLower.endsWith('.doc') ||
    mimeLower.includes('word') ||
    mimeLower.includes('officedocument');

  console.log(`[FILE_TYPE_DETECTION] Routing Decision: ${isDocx ? 'MAMMOTH (Word .docx)' : 'PDF-PARSE (PDF)'}`);
  console.log('====================================================');

  const rawText = isDocx
    ? await extractTextFromDocx(buffer)
    : await extractTextFromPdf(buffer);

  let rawParsedQuestions = [];
  let parseMethod = 'fixed-template';

  if (isFixedTemplateFormat(rawText)) {
    console.log('[pdfParserService] Fixed Template format detected.');
    parseMethod = 'fixed-template';
    rawParsedQuestions = parseFixedTemplate(rawText);
  } else {
    console.log(`[pdfParserService] Free-form ${isDocx ? 'Word' : 'PDF'} format detected.`);
    try {
      console.log('DIAGNOSTIC - Key check location - process.env.ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 'FOUND, length ' + process.env.ANTHROPIC_API_KEY.length : 'NOT FOUND');
      if (process.env.ANTHROPIC_API_KEY) {
        parseMethod = 'claude-ai';
        rawParsedQuestions = await parseFreeFormWithClaude(rawText);
      } else {
        console.log('[pdfParserService] ANTHROPIC_API_KEY not present in process.env, using heuristic fallback parser.');
        parseMethod = 'heuristic-fallback';
        rawParsedQuestions = parseFreeFormHeuristic(rawText);
      }
    } catch (err) {
      console.warn('[pdfParserService] Claude API failed or unavailable, using heuristic parser:', err.message);
      parseMethod = 'heuristic-fallback';
      rawParsedQuestions = parseFreeFormHeuristic(rawText);
    }
  }

  const enrichedQuestions = enrichAndValidateQuestions(rawParsedQuestions);

  console.log('====================================================');
  console.log('[PARSED_QUESTIONS_RESULT] Final Questions JSON Array sent to Frontend:');
  console.log(JSON.stringify(enrichedQuestions, null, 2).substring(0, 3000));
  console.log('[PARSED_QUESTIONS_RESULT] Total questions in final array:', enrichedQuestions.length);
  console.log('====================================================');

  return {
    documentType: isDocx ? 'docx' : 'pdf',
    rawTextLength: rawText.length,
    parseMethod,
    totalParsed: enrichedQuestions.length,
    questions: enrichedQuestions,
  };
}

module.exports = {
  extractTextFromPdf,
  extractTextFromDocx,
  isFixedTemplateFormat,
  parseFixedTemplate,
  parseFreeFormWithClaude,
  parseFreeFormHeuristic,
  parsePdfQuestions,
  parseDocumentQuestions,
};
