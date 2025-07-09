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
        
        // Generate shareable link with compressed data
        const compressedData = compressData(presentationData);
        const baseUrl = window.location.origin + window.location.pathname.replace('admin.html', 'index.html');
        const shareLink = `${baseUrl}?d=${compressedData}`;
        
        // Show share section
        document.getElementById('shareSection').style.display = 'block';
        document.getElementById('shareLink').textContent = shareLink;
        
    } catch (error) {
        alert('Error generating presentation. Please check your CSV data and try again.');
        console.error('Generation error:', error);
    }
}

function analyzeData(data) {
    const responseCount = data.data.length;
    
    // AI-powered analysis of CSV data
    const analysis = {
        responseCount: responseCount,
        collaborationScore: calculateCollaborationScore(data),
        positives: analyzePositiveFeedback(data),
        improvements: analyzeImprovements(data),
        immediate: generateSmartImmediateActions(data),
        longterm: generateSmartLongtermActions(data)
    };
    
    return analysis;
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

function analyzePositiveFeedback(data) {
    // Collect all positive feedback
    const allPositiveFeedback = collectFeedbackByType(data, ['well', 'good', 'strength', 'positive', 'great', 'excellent']);
    
    if (allPositiveFeedback.length === 0) {
        return getDefaultPositives();
    }
    
    // AI-powered theme analysis
    const themes = analyzeThemes(allPositiveFeedback);
    const synthesizedFeedback = [];
    
    // Group responses by themes and create summaries
    Object.entries(themes).forEach(([theme, responses]) => {
        if (responses.length > 0) {
            synthesizedFeedback.push({
                title: formatThemeTitle(theme),
                content: synthesizeResponses(responses, theme)
            });
        }
    });
    
    return synthesizedFeedback.slice(0, 6);
}

function analyzeImprovements(data) {
    // Collect improvement-related feedback
    const allImprovementFeedback = collectFeedbackByType(data, ['improve', 'better', 'issue', 'problem', 'challenge', 'difficult']);
    
    if (allImprovementFeedback.length === 0) {
        return getDefaultImprovements();
    }
    
    // AI-powered improvement analysis
    const improvementThemes = analyzeImprovementThemes(allImprovementFeedback);
    const synthesizedImprovements = [];
    
    Object.entries(improvementThemes).forEach(([theme, responses]) => {
        if (responses.length > 0) {
            synthesizedImprovements.push({
                title: formatThemeTitle(theme),
                content: synthesizeImprovementResponses(responses, theme)
            });
        }
    });
    
    return synthesizedImprovements.slice(0, 6);
}

function collectFeedbackByType(data, keywords) {
    const feedback = [];
    
    data.headers.forEach(header => {
        const headerLower = header.toLowerCase();
        const isRelevantColumn = keywords.some(keyword => headerLower.includes(keyword));
        
        if (isRelevantColumn) {
            data.data.forEach(row => {
                const value = row[header];
                if (value && value.trim() && value.trim().length > 10) {
                    feedback.push({
                        text: value.trim(),
                        column: header,
                        context: extractContext(value)
                    });
                }
            });
        }
    });
    
    return feedback;
}

function analyzeThemes(feedbackArray) {
    const themes = {
        'Communication & Collaboration': [],
        'Design Quality & Process': [],
        'Technical Integration': [],
        'Responsiveness & Support': [],
        'Documentation & Clarity': [],
        'Innovation & Creativity': []
    };
    
    feedbackArray.forEach(feedback => {
        const text = feedback.text.toLowerCase();
        
        // AI-like keyword matching for themes
        if (text.match(/\b(communicat|collaborat|work.{0,10}together|team|discuss|meet)\b/)) {
            themes['Communication & Collaboration'].push(feedback);
        } else if (text.match(/\b(design|visual|aesthetic|ui|ux|user.{0,10}experience|interface)\b/)) {
            themes['Design Quality & Process'].push(feedback);
        } else if (text.match(/\b(technical|code|implement|develop|engineer|integration)\b/)) {
            themes['Technical Integration'].push(feedback);
        } else if (text.match(/\b(quick|fast|responsive|available|support|help)\b/)) {
            themes['Responsiveness & Support'].push(feedback);
        } else if (text.match(/\b(document|figma|template|guid|instruct|clear|underst)\b/)) {
            themes['Documentation & Clarity'].push(feedback);
        } else if (text.match(/\b(creative|innovative|idea|solution|approach|think)\b/)) {
            themes['Innovation & Creativity'].push(feedback);
        } else {
            // Default to most relevant theme based on general positive indicators
            themes['Design Quality & Process'].push(feedback);
        }
    });
    
    return themes;
}

function analyzeImprovementThemes(feedbackArray) {
    const themes = {
        'Communication & Updates': [],
        'Process & Workflow': [],
        'Documentation & Clarity': [],
        'Resource & Capacity': [],
        'Technical Implementation': [],
        'Strategic Alignment': []
    };
    
    feedbackArray.forEach(feedback => {
        const text = feedback.text.toLowerCase();
        
        if (text.match(/\b(communicat|update|inform|share|tell|notify|aware)\b/)) {
            themes['Communication & Updates'].push(feedback);
        } else if (text.match(/\b(process|workflow|method|approach|way|how)\b/)) {
            themes['Process & Workflow'].push(feedback);
        } else if (text.match(/\b(document|clear|understand|confus|complex|simple)\b/)) {
            themes['Documentation & Clarity'].push(feedback);
        } else if (text.match(/\b(time|capacity|resource|bandwidth|workload|busy)\b/)) {
            themes['Resource & Capacity'].push(feedback);
        } else if (text.match(/\b(technical|implement|code|develop|feature|tool)\b/)) {
            themes['Technical Implementation'].push(feedback);
        } else if (text.match(/\b(strategic|goal|objective|direction|focus|priority)\b/)) {
            themes['Strategic Alignment'].push(feedback);
        } else {
            themes['Communication & Updates'].push(feedback);
        }
    });
    
    return themes;
}

function synthesizeResponses(responses, theme) {
    if (responses.length === 1) {
        return cleanAndSummarize(responses[0].text);
    }
    
    // Create a synthesized summary based on multiple responses
    const keyPoints = extractKeyPoints(responses);
    const commonPatterns = findCommonPatterns(responses);
    
    if (commonPatterns.length > 0) {
        return `Team consistently highlights ${commonPatterns.join(' and ')}. ${keyPoints.slice(0, 2).join(' ')}`;
    } else {
        return `Multiple team members noted: ${keyPoints.slice(0, 3).join(', ')}.`;
    }
}

function synthesizeImprovementResponses(responses, theme) {
    if (responses.length === 1) {
        return cleanAndSummarize(responses[0].text);
    }
    
    const keyIssues = extractImprovementPoints(responses);
    const frequency = responses.length;
    
    let synthesis = '';
    if (frequency > 1) {
        synthesis = `${frequency} team members identified this area. `;
    }
    
    synthesis += `Key suggestions include: ${keyIssues.slice(0, 2).join(' and ')}.`;
    
    return synthesis;
}

function extractKeyPoints(responses) {
    const points = [];
    
    responses.forEach(response => {
        const text = response.text;
        const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
        
        sentences.forEach(sentence => {
            if (sentence.length > 15 && sentence.length < 100) {
                points.push(cleanAndSummarize(sentence));
            }
        });
    });
    
    return [...new Set(points)]; // Remove duplicates
}

function extractImprovementPoints(responses) {
    const points = [];
    
    responses.forEach(response => {
        const text = response.text;
        // Look for actionable suggestions
        const actionablePattern = /\b(should|could|need|want|would like|suggest|recommend|improve|better|more|less)\b.{10,80}/gi;
        const matches = text.match(actionablePattern) || [];
        
        matches.forEach(match => {
            const cleaned = cleanAndSummarize(match);
            if (cleaned.length > 20) {
                points.push(cleaned);
            }
        });
        
        // If no actionable items found, use general text
        if (matches.length === 0) {
            const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 15 && s.length < 80);
            if (sentences.length > 0) {
                points.push(cleanAndSummarize(sentences[0]));
            }
        }
    });
    
    return [...new Set(points)];
}

function findCommonPatterns(responses) {
    const patterns = [];
    const texts = responses.map(r => r.text.toLowerCase());
    
    // Look for repeated key phrases
    const keyPhrases = ['communication', 'collaboration', 'documentation', 'visual', 'clear', 'helpful', 'responsive', 'quality'];
    
    keyPhrases.forEach(phrase => {
        const count = texts.filter(text => text.includes(phrase)).length;
        if (count > 1) {
            patterns.push(phrase);
        }
    });
    
    return patterns;
}

function cleanAndSummarize(text) {
    // Clean up text and create a more readable summary
    let cleaned = text.trim();
    
    // Remove common survey artifacts
    cleaned = cleaned.replace(/^(I think|I feel|I believe|In my opinion),?\s*/i, '');
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    // Ensure proper capitalization
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    
    // Ensure it ends properly
    if (!cleaned.match(/[.!?]$/)) {
        cleaned += '.';
    }
    
    return cleaned;
}

function extractContext(text) {
    // Extract contextual information for better analysis
    const context = {
        sentiment: analyzeSentiment(text),
        urgency: analyzeUrgency(text),
        specificity: analyzeSpecificity(text)
    };
    
    return context;
}

function analyzeSentiment(text) {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'helpful', 'clear', 'easy', 'effective'];
    const negativeWords = ['difficult', 'confusing', 'problem', 'issue', 'hard', 'unclear', 'frustrating'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
}

function analyzeUrgency(text) {
    const urgentWords = ['urgent', 'immediate', 'asap', 'critical', 'important', 'priority'];
    const lowerText = text.toLowerCase();
    
    return urgentWords.some(word => lowerText.includes(word)) ? 'high' : 'normal';
}

function analyzeSpecificity(text) {
    // Check if feedback includes specific examples or is general
    const specificIndicators = ['example', 'instance', 'specifically', 'particular', 'case'];
    const lowerText = text.toLowerCase();
    
    return specificIndicators.some(indicator => lowerText.includes(indicator)) ? 'specific' : 'general';
}

function generateSmartImmediateActions(data) {
    // Generate contextual immediate actions based on the actual feedback
    const improvementFeedback = collectFeedbackByType(data, ['improve', 'better', 'issue', 'problem']);
    const actions = [];
    
    // Analyze what came up most frequently
    const themes = analyzeImprovementThemes(improvementFeedback);
    
    Object.entries(themes).forEach(([theme, responses]) => {
        if (responses.length > 0) {
            const action = generateActionFromTheme(theme, responses, 'immediate');
            if (action) actions.push(action);
        }
    });
    
    // Ensure we have at least 3 actions
    while (actions.length < 3) {
        actions.push(...getDefaultImmediateActions().slice(actions.length));
    }
    
    return actions.slice(0, 3);
}

function generateSmartLongtermActions(data) {
    const improvementFeedback = collectFeedbackByType(data, ['improve', 'better', 'strategic', 'long']);
    const actions = [];
    
    const themes = analyzeImprovementThemes(improvementFeedback);
    
    Object.entries(themes).forEach(([theme, responses]) => {
        if (responses.length > 0) {
            const action = generateActionFromTheme(theme, responses, 'longterm');
            if (action) actions.push(action);
        }
    });
    
    while (actions.length < 4) {
        actions.push(...getDefaultLongtermActions().slice(actions.length));
    }
    
    return actions.slice(0, 4);
}

function generateActionFromTheme(theme, responses, timeframe) {
    const actionMap = {
        'immediate': {
            'Communication & Updates': {
                title: 'Weekly Communication',
                content: 'Establish weekly updates sharing current priorities and progress with the team'
            },
            'Documentation & Clarity': {
                title: 'Documentation Audit',
                content: 'Review and simplify existing documentation to improve clarity and accessibility'
            },
            'Process & Workflow': {
                title: 'Process Quick Fix',
                content: 'Identify and resolve the most immediate workflow bottlenecks'
            }
        },
        'longterm': {
            'Communication & Updates': {
                title: 'Communication Framework',
                content: 'Develop a structured approach for regular stakeholder communication and transparency'
            },
            'Strategic Alignment': {
                title: 'Strategic Integration',
                content: 'Create processes to better align daily work with broader strategic objectives'
            },
            'Technical Implementation': {
                title: 'Technical Collaboration',
                content: 'Establish improved workflows for design-engineering collaboration and handoffs'
            }
        }
    };
    
    return actionMap[timeframe][theme] || null;
}

function getDefaultPositives() {
    return [
        { title: "Team Collaboration", content: "Strong working relationships and effective communication with team members" },
        { title: "Quality Delivery", content: "Consistent delivery of high-quality work that meets expectations" },
        { title: "Responsive Support", content: "Quick to respond and provide assistance when needed" }
    ];
}

function getDefaultImprovements() {
    return [
        { title: "Communication Enhancement", content: "Opportunities to improve regular updates and status sharing" },
        { title: "Process Optimization", content: "Potential to streamline workflows and reduce bottlenecks" },
        { title: "Documentation Clarity", content: "Room to enhance clarity and accessibility of documentation" }
    ];
}

function getDefaultImmediateActions() {
    return [
        { title: "Weekly Updates", content: "Start sending brief weekly progress updates to the team" },
        { title: "Quick Documentation Review", content: "Audit and simplify overly complex documentation" },
        { title: "Feedback Collection", content: "Set up regular channels for ongoing feedback" }
    ];
}

function getDefaultLongtermActions() {
    return [
        { title: "Process Framework", content: "Develop standardized processes for recurring activities" },
        { title: "Skill Development", content: "Identify and pursue relevant training opportunities" },
        { title: "Team Integration", content: "Create more opportunities for cross-functional collaboration" },
        { title: "Success Metrics", content: "Establish clear metrics to track improvement progress" }
    ];
}

function formatThemeTitle(theme) {
    // Convert theme names to more readable titles
    const titleMap = {
        'Communication & Collaboration': 'Team Communication',
        'Design Quality & Process': 'Design Excellence',
        'Technical Integration': 'Technical Collaboration',
        'Responsiveness & Support': 'Team Support',
        'Documentation & Clarity': 'Clear Documentation',
        'Innovation & Creativity': 'Creative Solutions',
        'Communication & Updates': 'Information Sharing',
        'Process & Workflow': 'Process Improvement',
        'Resource & Capacity': 'Resource Management',
        'Technical Implementation': 'Technical Execution',
        'Strategic Alignment': 'Strategic Focus'
    };
    
    return titleMap[theme] || theme;
}

function compressData(data) {
    // Compress the data for URL sharing
    const jsonString = JSON.stringify(data);
    return btoa(encodeURIComponent(jsonString));
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