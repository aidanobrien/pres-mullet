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
            
            // Show customization section
            document.getElementById('customizationSection').style.display = 'block';
            document.getElementById('generateBtn').disabled = false;
            
            // Update upload area to show file loaded
            const uploadArea = document.getElementById('uploadArea');
            uploadArea.innerHTML = `
                <div class="upload-icon">✅</div>
                <div class="upload-text">${file.name}</div>
                <div class="upload-subtext">File loaded successfully (${surveyData.data.length} responses)</div>
            `;
            
            // Scroll to customization section
            document.getElementById('customizationSection').scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
            
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
    
    // Get custom inputs
    const customInputs = getCustomInputs();
    
    // Smart analysis using both CSV data and custom inputs
    const analysis = {
        responseCount: responseCount,
        collaborationScore: calculateCollaborationScore(data),
        positives: extractCustomFeedback(data, customInputs.positives, 'positive'),
        improvements: extractCustomFeedback(data, customInputs.improvements, 'improvement'),
        immediate: parseCustomActions(customInputs.immediate),
        longterm: parseCustomActions(customInputs.longterm),
        purpose: customInputs.purpose
    };
    
    return analysis;
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