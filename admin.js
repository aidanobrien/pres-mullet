let surveyData = null;
let presentationData = null;

// Admin functions
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
        alert('Please upload a CSV file.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csvText = e.target.result;
            surveyData = parseCSVData(csvText);
            
            // Analyze the survey structure and show preview
            const surveyAnalysis = analyzeSurveyStructure(surveyData);
            showSurveyPreview(surveyAnalysis);
            
            document.getElementById('generateBtn').disabled = false;
            
            // Update upload area to show file loaded
            const uploadArea = document.getElementById('uploadArea');
            uploadArea.innerHTML = `
                <div class="upload-icon">✅</div>
                <div class="upload-text">${file.name}</div>
                <div class="upload-subtext">File loaded successfully (${surveyData.data.length} responses)</div>
            `;
            
        } catch (error) {
            alert('Error reading CSV file. Please check the format and try again.');
            console.error('CSV parsing error:', error);
        }
    };
    reader.readAsText(file);
}

function analyzeSurveyStructure(data) {
    const headers = data.headers;
    const analysis = {
        surveyType: detectSurveyType(headers),
        questionCategories: categorizeQuestions(headers, data.data),
        responseCount: data.data.length,
        suggestedPages: []
    };
    
    // Create suggested presentation pages based on the analysis
    analysis.suggestedPages = generateSuggestedPages(analysis.questionCategories, data);
    
    return analysis;
}

function detectSurveyType(headers) {
    const headerText = headers.join(' ').toLowerCase();
    
    // Define survey type patterns
    const patterns = {
        'Employee Feedback': ['employee', 'workplace', 'job', 'manager', 'team', 'work environment'],
        'Customer Satisfaction': ['customer', 'service', 'product', 'satisfaction', 'experience', 'recommend'],
        'Event Feedback': ['event', 'conference', 'session', 'speaker', 'venue', 'workshop'],
        'Training Evaluation': ['training', 'course', 'learning', 'instructor', 'material', 'knowledge'],
        'Product Feedback': ['product', 'feature', 'usability', 'design', 'functionality', 'bug'],
        'Team Retrospective': ['sprint', 'retrospective', 'process', 'workflow', 'blockers', 'impediments'],
        'Performance Review': ['performance', 'goals', 'objectives', 'achievements', 'development', 'skills']
    };
    
    let bestMatch = 'General Survey';
    let highestScore = 0;
    
    Object.entries(patterns).forEach(([type, keywords]) => {
        const score = keywords.reduce((acc, keyword) => {
            return acc + (headerText.includes(keyword) ? 1 : 0);
        }, 0);
        
        if (score > highestScore) {
            highestScore = score;
            bestMatch = type;
        }
    });
    
    return bestMatch;
}

function categorizeQuestions(headers, data) {
    const categories = {};
    
    headers.forEach(header => {
        const category = classifyQuestion(header, data);
        if (!categories[category.type]) {
            categories[category.type] = [];
        }
        categories[category.type].push({
            question: header,
            type: category.type,
            sentiment: category.sentiment,
            dataType: category.dataType,
            sampleData: getSampleData(header, data)
        });
    });
    
    return categories;
}

function classifyQuestion(header, data) {
    const headerLower = header.toLowerCase();
    
    // Determine data type
    const sampleValues = data.slice(0, 5).map(row => row[header]).filter(val => val && val.trim());
    const dataType = determineDataType(sampleValues);
    
    // Classification patterns
    const patterns = {
        rating: {
            keywords: ['rate', 'rating', 'scale', 'score', 'satisfaction', 'likely', 'recommend'],
            sentiment: 'neutral'
        },
        positive: {
            keywords: ['good', 'well', 'best', 'like', 'enjoy', 'positive', 'strength', 'working'],
            sentiment: 'positive'
        },
        negative: {
            keywords: ['problem', 'issue', 'challenge', 'difficult', 'improve', 'better', 'concern', 'dislike'],
            sentiment: 'negative'
        },
        suggestion: {
            keywords: ['suggest', 'recommend', 'change', 'add', 'feature', 'would like', 'wish'],
            sentiment: 'constructive'
        },
        demographic: {
            keywords: ['age', 'gender', 'location', 'department', 'role', 'experience', 'years'],
            sentiment: 'neutral'
        },
        general: {
            keywords: ['comment', 'feedback', 'thoughts', 'opinion', 'additional', 'other', 'anything'],
            sentiment: 'neutral'
        }
    };
    
    // Find best matching pattern
    let bestMatch = { type: 'general', sentiment: 'neutral', dataType };
    let highestScore = 0;
    
    Object.entries(patterns).forEach(([type, pattern]) => {
        const score = pattern.keywords.reduce((acc, keyword) => {
            return acc + (headerLower.includes(keyword) ? 1 : 0);
        }, 0);
        
        if (score > highestScore) {
            highestScore = score;
            bestMatch = { type, sentiment: pattern.sentiment, dataType };
        }
    });
    
    return bestMatch;
}

function determineDataType(sampleValues) {
    if (sampleValues.length === 0) return 'text';
    
    // Check if all values are numbers
    const allNumbers = sampleValues.every(val => !isNaN(parseFloat(val)) && isFinite(val));
    if (allNumbers) return 'numeric';
    
    // Check if values look like ratings/scales
    const ratingPattern = /^[1-5]$|^[1-9]\/10$|strongly|agree|disagree|excellent|good|fair|poor/i;
    const hasRatings = sampleValues.some(val => ratingPattern.test(val));
    if (hasRatings) return 'rating';
    
    // Check for yes/no responses
    const yesNoPattern = /^(yes|no|y|n|true|false)$/i;
    const hasYesNo = sampleValues.every(val => yesNoPattern.test(val));
    if (hasYesNo) return 'boolean';
    
    // Check for short vs long text
    const avgLength = sampleValues.reduce((acc, val) => acc + val.length, 0) / sampleValues.length;
    return avgLength > 50 ? 'longtext' : 'text';
}

function getSampleData(header, data) {
    return data.slice(0, 3)
        .map(row => row[header])
        .filter(val => val && val.trim())
        .slice(0, 2);
}

function generateSuggestedPages(categories, data) {
    const pages = [];
    
    // Always include response overview
    pages.push({
        title: "Response Overview",
        type: "overview",
        description: `${data.data.length} responses collected`,
        questions: []
    });
    
    // Create pages based on question categories
    Object.entries(categories).forEach(([categoryType, questions]) => {
        if (questions.length === 0) return;
        
        const pageConfig = getPageConfigForCategory(categoryType, questions);
        if (pageConfig) {
            pages.push({
                ...pageConfig,
                questions: questions.map(q => q.question)
            });
        }
    });
    
    // Ensure we have at least 3 pages but not more than 6
    while (pages.length < 3 && pages.length < 6) {
        // Add general insights page if we have text responses
        const textQuestions = Object.values(categories).flat()
            .filter(q => q.dataType === 'longtext' || q.dataType === 'text');
        
        if (textQuestions.length > 0 && !pages.find(p => p.type === 'insights')) {
            pages.push({
                title: "Key Insights",
                type: "insights",
                description: "Important themes from text responses",
                questions: textQuestions.slice(0, 5).map(q => q.question)
            });
        } else {
            break;
        }
    }
    
    return pages.slice(0, 6); // Maximum 6 pages
}

function getPageConfigForCategory(categoryType, questions) {
    const configs = {
        rating: {
            title: "Ratings & Scores",
            type: "ratings",
            description: "Numerical ratings and satisfaction scores"
        },
        positive: {
            title: "Positive Feedback",
            type: "positive",
            description: "What's working well and positive comments"
        },
        negative: {
            title: "Areas for Improvement",
            type: "improvement",
            description: "Challenges and areas needing attention"
        },
        suggestion: {
            title: "Suggestions & Ideas",
            type: "suggestions",
            description: "Recommendations and feature requests"
        },
        general: {
            title: "General Feedback",
            type: "general",
            description: "Additional comments and observations"
        }
    };
    
    return configs[categoryType] || null;
}

function showSurveyPreview(analysis) {
    const customizationSection = document.getElementById('customizationSection');
    customizationSection.style.display = 'block';
    
    // Update the customization section with dynamic content
    customizationSection.innerHTML = `
        <h3 class="customization-title">📊 Survey Analysis</h3>
        <div class="analysis-preview">
            <div class="survey-info">
                <div class="info-item">
                    <strong>Survey Type:</strong> ${analysis.surveyType}
                </div>
                <div class="info-item">
                    <strong>Response Count:</strong> ${analysis.responseCount}
                </div>
                <div class="info-item">
                    <strong>Question Categories:</strong> ${Object.keys(analysis.questionCategories).join(', ')}
                </div>
            </div>
            
            <h4>📋 Suggested Presentation Pages:</h4>
            <div class="suggested-pages">
                ${analysis.suggestedPages.map((page, index) => `
                    <div class="page-preview">
                        <div class="page-header">
                            <strong>Slide ${index + 1}: ${page.title}</strong>
                        </div>
                        <div class="page-description">${page.description}</div>
                        <div class="page-questions">
                            ${page.questions.length > 0 ? 
                                `<small>Based on: ${page.questions.slice(0, 2).join(', ')}${page.questions.length > 2 ? '...' : ''}</small>` 
                                : '<small>Generated content</small>'
                            }
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="analysis-actions">
                <button type="button" onclick="editSurveyAnalysis()" class="edit-btn">✏️ Customize Analysis</button>
            </div>
        </div>
    `;
    
    // Store analysis for generation
    window.currentAnalysis = analysis;
    
    // Scroll to show the analysis
    customizationSection.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
    });
}

function editSurveyAnalysis() {
    // Allow manual editing of the analysis if needed
    alert('Manual editing feature coming soon! For now, the system will auto-generate based on the detected survey structure.');
}

function parseCSVData(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
        throw new Error('CSV must have at least a header row and one data row');
    }
    
    const headers = parseCSVLine(lines[0]);
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length > 0 && values.some(v => v.trim())) { // Skip empty rows
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            data.push(row);
        }
    }
    
    return { headers, data };
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

function generatePresentation() {
    if (!surveyData) return;

    try {
        // Analyze the data and create presentation content
        presentationData = analyzeData(surveyData);
        
        // Generate shareable link with optimized compression
        const compressedData = compressData(presentationData);
        const baseUrl = window.location.origin + window.location.pathname.replace('admin.html', 'index.html');
        const shareLink = `${baseUrl}?d=${compressedData}`;
        
        // Check URL length and warn if it might be problematic
        if (shareLink.length > 2000) {
            console.warn('Generated URL is quite long:', shareLink.length, 'characters');
        }
        
        // Show share section
        document.getElementById('shareSection').style.display = 'block';
        document.getElementById('shareSection').innerHTML = `
            <h3 class="share-title">🎉 Presentation Ready!</h3>
            <div class="share-link" id="shareLink">${shareLink}</div>
            <div class="share-actions">
                <button class="copy-btn" onclick="copyShareLink()">📋 Copy Link</button>
                <button class="preview-btn" onclick="previewPresentation()">👀 Preview</button>
                <button class="reset-btn" onclick="resetAdmin()">🔄 Reset</button>
            </div>
            ${shareLink.length > 2000 ? 
                '<div class="url-warning">⚠️ This URL is quite long. Some email clients may truncate it. Consider using a URL shortener.</div>' : 
                ''
            }
        `;
        
    } catch (error) {
        alert('Error generating presentation. Please check your CSV data and try again.');
        console.error('Generation error:', error);
    }
}

function analyzeData(data) {
    // Use the stored analysis from file upload
    const analysis = window.currentAnalysis;
    if (!analysis) {
        throw new Error('No survey analysis available');
    }
    
    // Generate content for each suggested page
    const presentationData = {
        responseCount: analysis.responseCount,
        surveyType: analysis.surveyType,
        pages: []
    };
    
    analysis.suggestedPages.forEach(page => {
        const pageData = generatePageContent(page, data, analysis.questionCategories);
        presentationData.pages.push(pageData);
    });
    
    return presentationData;
}

function generatePageContent(page, data, categories) {
    switch (page.type) {
        case 'overview':
            return generateOverviewPage(data, categories);
        case 'ratings':
            return generateRatingsPage(page, data, categories);
        case 'positive':
            return generateFeedbackPage(page, data, categories, 'positive');
        case 'improvement':
            return generateFeedbackPage(page, data, categories, 'negative');
        case 'suggestions':
            return generateFeedbackPage(page, data, categories, 'suggestion');
        case 'insights':
            return generateInsightsPage(page, data, categories);
        default:
            return generateGeneralPage(page, data, categories);
    }
}

function generateOverviewPage(data, categories) {
    const stats = [];
    
    // Calculate key metrics
    const responseCount = data.data.length;
    stats.push({
        title: "Total Responses",
        value: responseCount,
        description: "Survey participants"
    });
    
    // Count question types
    const questionTypes = Object.keys(categories);
    stats.push({
        title: "Question Categories",
        value: questionTypes.length,
        description: questionTypes.join(', ')
    });
    
    // Find completion rate if possible
    const completionRate = calculateCompletionRate(data);
    if (completionRate !== null) {
        stats.push({
            title: "Completion Rate",
            value: `${completionRate}%`,
            description: "Responses completed"
        });
    }
    
    return {
        title: "Survey Overview",
        type: "overview",
        content: stats
    };
}

function generateRatingsPage(page, data, categories) {
    const ratingQuestions = categories.rating || [];
    const content = [];
    
    ratingQuestions.forEach(question => {
        const questionData = question.question;
        const values = data.data.map(row => row[questionData]).filter(val => val && val.trim());
        
        if (values.length > 0) {
            const average = calculateAverage(values);
            const distribution = calculateDistribution(values);
            
            content.push({
                title: truncateText(questionData, 40),
                value: average !== null ? average.toFixed(1) : 'N/A',
                description: `Based on ${values.length} responses`,
                distribution: distribution
            });
        }
    });
    
    return {
        title: page.title,
        type: "ratings",
        content: content
    };
}

function generateFeedbackPage(page, data, categories, sentiment) {
    const relevantQuestions = categories[sentiment] || [];
    const content = [];
    
    relevantQuestions.forEach(question => {
        const questionData = question.question;
        const responses = data.data
            .map(row => row[questionData])
            .filter(val => val && val.trim() && val.length > 10);
        
        // Extract key themes from responses
        const themes = extractThemes(responses);
        themes.forEach(theme => {
            if (theme.examples.length > 0) {
                content.push({
                    title: theme.title,
                    content: theme.examples[0], // Use first example as main content
                    count: theme.count
                });
            }
        });
    });
    
    // If no themed content, create generic items
    if (content.length === 0) {
        const allResponses = relevantQuestions.flatMap(q => 
            data.data.map(row => row[q.question]).filter(val => val && val.trim())
        );
        
        allResponses.slice(0, 6).forEach((response, index) => {
            content.push({
                title: `Response ${index + 1}`,
                content: response
            });
        });
    }
    
    return {
        title: page.title,
        type: "feedback",
        content: content.slice(0, 6)
    };
}

function generateInsightsPage(page, data, categories) {
    const textQuestions = Object.values(categories).flat()
        .filter(q => q.dataType === 'longtext' || q.dataType === 'text');
    
    const allResponses = textQuestions.flatMap(question => 
        data.data.map(row => row[question.question]).filter(val => val && val.trim())
    );
    
    const themes = extractThemes(allResponses);
    const content = themes.slice(0, 6).map(theme => ({
        title: theme.title,
        content: `${theme.count} mentions: ${theme.examples[0]}`,
        count: theme.count
    }));
    
    return {
        title: page.title,
        type: "insights",
        content: content
    };
}

function generateGeneralPage(page, data, categories) {
    const content = page.questions.map(questionText => {
        const responses = data.data
            .map(row => row[questionText])
            .filter(val => val && val.trim());
        
        const summary = summarizeResponses(responses);
        return {
            title: truncateText(questionText, 30),
            content: summary,
            count: responses.length
        };
    });
    
    return {
        title: page.title,
        type: "general",
        content: content
    };
}

// Helper functions
function calculateCompletionRate(data) {
    const totalQuestions = data.headers.length;
    const completedResponses = data.data.filter(row => {
        const filledFields = Object.values(row).filter(val => val && val.trim()).length;
        return filledFields / totalQuestions > 0.7; // 70% completion threshold
    });
    
    return totalQuestions > 0 ? Math.round((completedResponses.length / data.data.length) * 100) : null;
}

function calculateAverage(values) {
    const numbers = values.map(val => {
        const num = parseFloat(val);
        return isNaN(num) ? null : num;
    }).filter(num => num !== null);
    
    return numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) / numbers.length : null;
}

function calculateDistribution(values) {
    const counts = {};
    values.forEach(val => {
        counts[val] = (counts[val] || 0) + 1;
    });
    return counts;
}

function extractThemes(responses) {
    if (responses.length === 0) return [];
    
    // Simple keyword-based theme extraction
    const wordFreq = {};
    const themes = [];
    
    responses.forEach(response => {
        const words = response.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3 && !isStopWord(word));
        
        words.forEach(word => {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
        });
    });
    
    // Find common themes
    const sortedWords = Object.entries(wordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
    
    sortedWords.forEach(([word, count]) => {
        if (count > 1) {
            const examples = responses.filter(r => 
                r.toLowerCase().includes(word)
            ).slice(0, 3);
            
            themes.push({
                title: capitalizeFirst(word),
                count: count,
                examples: examples
            });
        }
    });
    
    return themes;
}

function isStopWord(word) {
    const stopWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'man', 'men', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'oil', 'sit', 'set'];
    return stopWords.includes(word);
}

function summarizeResponses(responses) {
    if (responses.length === 0) return 'No responses';
    if (responses.length === 1) return responses[0];
    
    // For multiple responses, find the most common patterns
    const shortResponses = responses.filter(r => r.length < 100);
    if (shortResponses.length > 0) {
        return shortResponses[0]; // Return first short response as summary
    }
    
    return responses[0].substring(0, 100) + '...';
}

function truncateText(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function getCustomInputs() {
    return {
        positives: document.getElementById('positivesInput').value || '',
        improvements: document.getElementById('improvementsInput').value || '',
        immediate: document.getElementById('immediateInput').value || '',
        longterm: document.getElementById('longtermInput').value || '',
        purpose: document.getElementById('purposeInput').value || 'This survey was conducted to gather feedback from the team.'
    };
}

function extractCustomFeedback(data, keywords, type) {
    const keywordList = keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k);
    
    if (keywordList.length === 0) {
        return getDefaultFeedback(type);
    }
    
    // Find relevant columns based on keywords and typical column names
    const relevantColumns = findRelevantColumns(data.headers, keywordList, type);
    
    const feedback = [];
    const uniqueResponses = new Set();
    
    data.data.forEach(row => {
        relevantColumns.forEach(col => {
            const value = row[col];
            if (value && value.trim() && value.trim().length > 10) {
                const cleanedValue = value.trim();
                if (!uniqueResponses.has(cleanedValue.toLowerCase())) {
                    uniqueResponses.add(cleanedValue.toLowerCase());
                    
                    // Check if response contains any of our keywords
                    const containsKeyword = keywordList.some(keyword => 
                        cleanedValue.toLowerCase().includes(keyword)
                    );
                    
                    if (containsKeyword || relevantColumns.length === 1) {
                        const sentences = cleanedValue.split(/[.!?]+/).filter(s => s.trim().length > 10);
                        
                        if (sentences.length > 0) {
                            sentences.forEach(sentence => {
                                const cleaned = sentence.trim();
                                if (cleaned.length > 15) {
                                    feedback.push({
                                        title: extractTitleFromKeywords(cleaned, keywordList),
                                        content: cleaned
                                    });
                                }
                            });
                        } else {
                            feedback.push({
                                title: extractTitleFromKeywords(cleanedValue, keywordList),
                                content: cleanedValue
                            });
                        }
                    }
                }
            }
        });
    });
    
    // If no feedback found, create generic items based on keywords
    if (feedback.length === 0) {
        return keywordList.slice(0, 6).map(keyword => ({
            title: capitalizeFirst(keyword),
            content: `Team feedback highlighted ${keyword} as an important area to focus on.`
        }));
    }
    
    return feedback.slice(0, 6); // Limit to 6 items
}

function findRelevantColumns(headers, keywords, type) {
    const typeKeywords = {
        positive: ['well', 'good', 'strength', 'positive', 'working', 'great', 'excellent'],
        improvement: ['improve', 'better', 'issue', 'problem', 'challenge', 'difficult', 'change']
    };
    
    const allKeywords = [...keywords, ...typeKeywords[type]];
    
    return headers.filter(header => {
        const headerLower = header.toLowerCase();
        return allKeywords.some(keyword => headerLower.includes(keyword));
    });
}

function extractTitleFromKeywords(text, keywords) {
    // Try to find a keyword in the text to use as title
    const foundKeyword = keywords.find(keyword => 
        text.toLowerCase().includes(keyword)
    );
    
    if (foundKeyword) {
        return capitalizeFirst(foundKeyword);
    }
    
    // Fallback to extracting title from text
    const words = text.split(' ').slice(0, 3);
    let title = words.join(' ');
    title = title.replace(/[^\w\s]/g, '').trim();
    return capitalizeFirst(title) || "Feedback Point";
}

function parseCustomActions(actionsText) {
    if (!actionsText || !actionsText.trim()) {
        return [];
    }
    
    return actionsText.split(',')
        .map(action => action.trim())
        .filter(action => action.length > 0)
        .slice(0, 6) // Limit to 6 actions
        .map(action => ({
            title: extractActionTitle(action),
            content: action
        }));
}

function extractActionTitle(action) {
    // Extract first few words as title
    const words = action.split(' ').slice(0, 3);
    return words.join(' ').replace(/[^\w\s]/g, '').trim() || 'Action Item';
}

function getDefaultFeedback(type) {
    const defaults = {
        positive: [
            { title: "Team Collaboration", content: "Strong working relationships and communication" },
            { title: "Quality Work", content: "Consistent delivery of high-quality outputs" },
            { title: "Responsive Support", content: "Quick to respond and provide assistance when needed" }
        ],
        improvement: [
            { title: "Communication", content: "Improve regular updates and status sharing" },
            { title: "Documentation", content: "Enhance clarity and accessibility of documentation" },
            { title: "Process Efficiency", content: "Streamline workflows and reduce bottlenecks" }
        ]
    };
    
    return defaults[type] || [];
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function calculateCollaborationScore(data) {
    // Look for collaboration-related columns
    const collaborationColumns = data.headers.filter(header => 
        header.toLowerCase().includes('collaboration') || 
        header.toLowerCase().includes('work') ||
        header.toLowerCase().includes('team')
    );
    
    if (collaborationColumns.length === 0) return "N/A";
    
    // Count positive responses
    let positiveCount = 0;
    let totalCount = 0;
    
    data.data.forEach(row => {
        collaborationColumns.forEach(col => {
            const value = row[col]?.toLowerCase();
            if (value && value !== '') {
                totalCount++;
                if (value.includes('yes') || value.includes('good') || value.includes('positive')) {
                    positiveCount++;
                }
            }
        });
    });
    
    if (totalCount === 0) return "N/A";
    return Math.round((positiveCount / totalCount) * 100) + "%";
}

function extractPositiveFeedback(data) {
    const positiveColumns = data.headers.filter(header => 
        header.toLowerCase().includes('well') || 
        header.toLowerCase().includes('good') ||
        header.toLowerCase().includes('strength') ||
        header.toLowerCase().includes('positive')
    );
    
    const feedback = [];
    const responses = new Set();
    
    data.data.forEach(row => {
        positiveColumns.forEach(col => {
            const value = row[col];
            if (value && value.trim() && value.trim().length > 10 && !responses.has(value.trim())) {
                responses.add(value.trim());
                
                // Extract key themes
                const sentences = value.split(/[.!?]+/).filter(s => s.trim().length > 5);
                sentences.forEach(sentence => {
                    const cleaned = sentence.trim();
                    if (cleaned.length > 20) {
                        feedback.push({
                            title: extractTitle(cleaned),
                            content: cleaned
                        });
                    }
                });
            }
        });
    });
    
    // If no specific positive feedback found, use defaults
    if (feedback.length === 0) {
        return [
            { title: "Team Collaboration", content: "Strong working relationships and communication" },
            { title: "Quality Work", content: "Consistent delivery of high-quality outputs" },
            { title: "Responsive Support", content: "Quick to respond and provide assistance when needed" }
        ];
    }
    
    return feedback.slice(0, 6); // Limit to 6 items
}

function extractImprovements(data) {
    const improvementColumns = data.headers.filter(header => 
        header.toLowerCase().includes('improve') || 
        header.toLowerCase().includes('better') ||
        header.toLowerCase().includes('issue') ||
        header.toLowerCase().includes('problem')
    );
    
    const feedback = [];
    const responses = new Set();
    
    data.data.forEach(row => {
        improvementColumns.forEach(col => {
            const value = row[col];
            if (value && value.trim() && value.trim().length > 10 && !responses.has(value.trim())) {
                responses.add(value.trim());
                
                const sentences = value.split(/[.!?]+/).filter(s => s.trim().length > 5);
                sentences.forEach(sentence => {
                    const cleaned = sentence.trim();
                    if (cleaned.length > 20) {
                        feedback.push({
                            title: extractTitle(cleaned),
                            content: cleaned
                        });
                    }
                });
            }
        });
    });
    
    // If no specific improvement feedback found, use defaults
    if (feedback.length === 0) {
        return [
            { title: "Communication", content: "Improve regular updates and status sharing" },
            { title: "Documentation", content: "Enhance clarity and accessibility of documentation" },
            { title: "Process Efficiency", content: "Streamline workflows and reduce bottlenecks" }
        ];
    }
    
    return feedback.slice(0, 6);
}

function generateImmediateActions(data) {
    // Generate immediate actions based on improvement areas
    return [
        { title: "Weekly Updates", content: "Start sending brief weekly progress updates to the team" },
        { title: "Quick Documentation Review", content: "Audit and simplify overly complex documentation" },
        { title: "Feedback Collection", content: "Set up regular channels for ongoing feedback" }
    ];
}

function generateLongtermActions(data) {
    // Generate long-term actions
    return [
        { title: "Process Framework", content: "Develop standardized processes for recurring activities" },
        { title: "Skill Development", content: "Identify and pursue relevant training opportunities" },
        { title: "Team Integration", content: "Create more opportunities for cross-functional collaboration" },
        { title: "Success Metrics", content: "Establish clear metrics to track improvement progress" }
    ];
}

function extractTitle(text) {
    // Extract a concise title from longer text
    const words = text.split(' ').slice(0, 4);
    let title = words.join(' ');
    
    // Clean up the title
    title = title.replace(/[^\w\s]/g, '').trim();
    title = title.charAt(0).toUpperCase() + title.slice(1);
    
    return title || "Feedback Point";
}

function compressData(data) {
    try {
        // First, optimize the data by removing unnecessary fields and truncating long text
        const optimizedData = optimizeDataForURL(data);
        
        // Convert to JSON and compress
        const jsonString = JSON.stringify(optimizedData);
        
        // Check if the data is too large for URL
        if (jsonString.length > 2000) { // Conservative limit
            // Use a more aggressive optimization for large datasets
            const compactData = createCompactVersion(data);
            const compactJson = JSON.stringify(compactData);
            
            if (compactJson.length > 2000) {
                // Still too large, use localStorage as fallback
                return saveToLocalStorage(data);
            }
            
            return btoa(encodeURIComponent(compactJson));
        }
        
        return btoa(encodeURIComponent(jsonString));
    } catch (error) {
        console.error('Error compressing data:', error);
        throw new Error('Failed to compress presentation data');
    }
}

function optimizeDataForURL(data) {
    const optimized = {
        responseCount: data.responseCount,
        surveyType: data.surveyType,
        pages: []
    };
    
    if (data.pages && Array.isArray(data.pages)) {
        optimized.pages = data.pages.map(page => ({
            title: truncateText(page.title, 50),
            type: page.type,
            content: optimizePageContent(page.content, page.type)
        }));
    }
    
    return optimized;
}

function optimizePageContent(content, pageType) {
    if (!Array.isArray(content)) return content;
    
    // Limit number of items and truncate text
    return content.slice(0, 6).map(item => {
        if (typeof item === 'object') {
            return {
                title: truncateText(item.title, 40),
                content: truncateText(item.content, 150),
                ...(item.value && { value: item.value }),
                ...(item.count && { count: item.count })
            };
        }
        return truncateText(item.toString(), 100);
    });
}

function createCompactVersion(data) {
    // Create a very minimal version for large datasets
    return {
        rc: data.responseCount, // responseCount
        st: truncateText(data.surveyType, 30), // surveyType
        p: (data.pages || []).slice(0, 4).map(page => ({ // pages (max 4)
            t: truncateText(page.title, 30), // title
            ty: page.type, // type
            c: (page.content || []).slice(0, 4).map(item => ({ // content (max 4 items)
                t: truncateText(item.title, 25), // title
                c: truncateText(item.content, 80) // content
            }))
        }))
    };
}

function saveToLocalStorage(data) {
    // Generate a unique ID for this presentation
    const presentationId = 'pres_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    try {
        // Save to localStorage
        localStorage.setItem(presentationId, JSON.stringify(data));
        
        // Return the ID instead of the full data
        return btoa(JSON.stringify({ 
            type: 'localStorage', 
            id: presentationId,
            fallback: createCompactVersion(data) // Fallback for browsers without localStorage
        }));
    } catch (error) {
        console.error('LocalStorage save failed:', error);
        // Final fallback - just use the compact version
        return btoa(encodeURIComponent(JSON.stringify(createCompactVersion(data))));
    }
}

function truncateText(text, maxLength) {
    if (!text) return '';
    const str = text.toString();
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}

function copyShareLink() {
    const shareLink = document.getElementById('shareLink').textContent;
    navigator.clipboard.writeText(shareLink).then(() => {
        const copyBtn = document.querySelector('.copy-btn');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✅ Copied!';
        copyBtn.style.background = '#48bb78';
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.background = '#667eea';
        }, 2000);
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        const copyBtn = document.querySelector('.copy-btn');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✅ Copied!';
        setTimeout(() => {
            copyBtn.textContent = originalText;
        }, 2000);
    });
}

function previewPresentation() {
    const shareLink = document.getElementById('shareLink').textContent;
    window.open(shareLink, '_blank');
}

function resetAdmin() {
    // Reset the form
    document.getElementById('csvFile').value = '';
    document.getElementById('generateBtn').disabled = true;
    document.getElementById('shareSection').style.display = 'none';
    document.getElementById('customizationSection').style.display = 'none';
    
    // Reset custom inputs to defaults
    document.getElementById('positivesInput').value = 'collaboration, communication, quality of work, responsiveness, technical skills';
    document.getElementById('improvementsInput').value = 'documentation, meetings, processes, tools, training';
    document.getElementById('immediateInput').value = 'Send weekly updates, Review documentation, Set up feedback channels';
    document.getElementById('longtermInput').value = 'Develop training program, Implement new tools, Create process framework';
    document.getElementById('purposeInput').value = 'This survey was conducted to gather feedback from the team on how effectively we\'re collaborating and contributing to our shared goals. The aim is to understand what\'s working well and identify areas where we can improve to better support our objectives.';
    
    // Reset upload area
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.innerHTML = `
        <div class="upload-icon">📊</div>
        <div class="upload-text">Drop your CSV file here</div>
        <div class="upload-subtext">or click to browse</div>
    `;
    
    // Clear data
    surveyData = null;
    presentationData = null;
}

// Drag and drop functionality
const uploadArea = document.getElementById('uploadArea');

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const fileInput = document.getElementById('csvFile');
        fileInput.files = files;
        handleFileUpload({ target: { files: files } });
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin interface loaded');
});