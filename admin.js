let surveyData = null;
let presentationData = null;
let selectedDensity = 'medium'; // Default to medium

// Content density selection
function selectDensity(density) {
    selectedDensity = density;
    
    // Update button states
    document.querySelectorAll('.density-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    document.querySelector(`[data-density="${density}"]`).classList.add('selected');
}

// Simple file upload
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
        alert('Please upload a CSV file.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csvText = e.target.result;
            surveyData = parseCSVData(csvText);
            
            // Show context section
            document.getElementById('surveyContextSection').style.display = 'block';

            // Show density section
            document.getElementById('contentDensitySection').style.display = 'block';
            
            // Update upload area
            const uploadArea = document.getElementById('uploadArea');
            uploadArea.innerHTML = `
                <div class="upload-icon">✅</div>
                <div class="upload-text">${file.name}</div>
                <div class="upload-subtext">${surveyData.data.length} responses loaded</div>
            `;
            
            // Enable generate button if API is ready
            updateGenerateButton();
            
        } catch (error) {
            alert('Error reading CSV file. Please check the format and try again.');
            console.error('CSV parsing error:', error);
        }
    };
    reader.readAsText(file);
}

function parseCSVData(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    const headers = parseCSVLine(lines[0]);
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length > 0 && values.some(v => v.trim())) {
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

// API Management
function handleApiKeyInput() {
    const apiKey = document.getElementById('claudeApiKey').value;
    document.querySelector('.test-api-btn').disabled = !apiKey || apiKey.length < 10;
    updateGenerateButton();
}

function saveApiKey() {
    const apiKey = document.getElementById('claudeApiKey').value.trim();
    if (apiKey) {
        localStorage.setItem('claude_api_key', apiKey);
        testApiConnection(apiKey);
    }
}

function clearApiKey() {
    document.getElementById('claudeApiKey').value = '';
    localStorage.removeItem('claude_api_key');
    const statusEl = document.getElementById('apiStatus');
    statusEl.innerHTML = '<span class="status-indicator offline">●</span><span>API not configured</span>';
    document.querySelector('.test-api-btn').disabled = true;
    window.claudeApiReady = false;
    updateGenerateButton();
}

function toggleApiKeyVisibility() {
    const input = document.getElementById('claudeApiKey');
    const button = document.querySelector('.toggle-visibility-btn');
    
    if (input.type === 'password') {
        input.type = 'text';
        button.textContent = '🙈';
    } else {
        input.type = 'password';
        button.textContent = '👁️';
    }
}

function manualTestApi() {
    const apiKey = document.getElementById('claudeApiKey').value.trim();
    if (apiKey) saveApiKey();
}

function updateGenerateButton() {
    const generateBtn = document.getElementById('generateBtn');
    generateBtn.disabled = !surveyData || !window.claudeApiReady;
}

// API Connection
function getApiEndpoint() {
    if (window.location.hostname.includes('netlify')) {
        return '/.netlify/functions/claude-api';
    }
    return 'http://localhost:3001/api';
}

async function testApiConnection(apiKey) {
    const statusEl = document.getElementById('apiStatus');
    statusEl.innerHTML = '<span class="status-indicator testing">●</span><span>Testing connection...</span>';
    
    try {
        const apiEndpoint = getApiEndpoint();
        const testUrl = apiEndpoint.includes('netlify') ? apiEndpoint : `${apiEndpoint}/test`;
        
        const response = await fetch(testUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: apiKey, action: 'test' })
        });
        
        const data = await response.json();
        
        if (response.ok && (data.status === 'connected' || data.status === 'NEW_FUNCTION_DEPLOYED')) {
            statusEl.innerHTML = '<span class="status-indicator online">●</span><span>API connected</span>';
            window.claudeApiReady = true;
        } else {
            statusEl.innerHTML = `<span class="status-indicator offline">●</span><span>Connection failed</span>`;
            window.claudeApiReady = false;
        }
        
        updateGenerateButton();
        
    } catch (error) {
        statusEl.innerHTML = '<span class="status-indicator offline">●</span><span>Connection failed</span>';
        window.claudeApiReady = false;
        updateGenerateButton();
    }
}

// Generate Presentation - SIMPLE VERSION
async function generatePresentation() {
    if (!surveyData || !window.claudeApiReady) return;

    try {
        const generateBtn = document.getElementById('generateBtn');
        generateBtn.disabled = true;
        generateBtn.textContent = 'Generating...';
        
        // Get survey context
        const surveyContext = document.getElementById('surveyContext').value || 
            'This survey was conducted to gather feedback and insights.';
        
        // Create simple presentation structure
        presentationData = await createSimplePresentation(surveyData, surveyContext);
        
        // Generate shareable link - handle large data by using localStorage
        const compressedData = compressData(presentationData);
        const baseUrl = window.location.origin + window.location.pathname.replace('admin.html', 'index.html');
        
        let shareLink;
        
        // If the data is too large for URL (over 2000 chars), use localStorage
        if (compressedData.length > 2000) {
            const presentationId = 'presentation_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem(presentationId, JSON.stringify(presentationData));
            
            // Create a compact reference
            const compactRef = btoa(JSON.stringify({
                type: 'localStorage',
                id: presentationId,
                timestamp: Date.now()
            }));
            
            shareLink = `${baseUrl}?d=${compactRef}`;
        } else {
            shareLink = `${baseUrl}?d=${compressedData}`;
        }
        
        // Show results
        document.getElementById('shareSection').style.display = 'block';
        document.getElementById('shareLink').textContent = shareLink;
        
        // Auto-scroll to the share section so user knows what to do next
        setTimeout(() => {
            document.getElementById('shareSection').scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }, 300);
        
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Presentation';
        
    } catch (error) {
        alert('Error generating presentation: ' + error.message);
        const generateBtn = document.getElementById('generateBtn');
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Presentation';
    }
}

async function createSimplePresentation(data, surveyContext) {
    console.log('Creating presentation with context:', surveyContext);
    
    // Get all text responses
    const allResponses = [];
    data.headers.forEach(header => {
        if (!header.toLowerCase().includes('id') && 
            !header.toLowerCase().includes('date') && 
            !header.toLowerCase().includes('time') &&
            !header.startsWith('#')) {
            
            data.data.forEach(row => {
                const value = row[header];
                if (value && value.trim() && value.length > 10) {
                    allResponses.push(value.trim());
                }
            });
        }
    });
    
    console.log(`Found ${allResponses.length} responses to analyze`);
    
    // Ask Claude to create the entire presentation structure
    const presentationStructure = await askClaudeForPresentationStructure(allResponses, surveyContext, data.data.length);
    
    return presentationStructure;
}

async function askClaudeForPresentationStructure(responses, context, responseCount) {
    const apiEndpoint = getApiEndpoint();
    const analyzeUrl = apiEndpoint.includes('netlify') ? apiEndpoint : `${apiEndpoint}/claude`;
    
    // Get content density instructions
    const densityInstructions = {
        'brief': 'Keep content very concise - 1-2 sentences per insight. Focus on key points only.',
        'medium': 'Provide moderate detail - 2-3 sentences per insight with some examples.',
        'detailed': 'Provide comprehensive analysis - 3-4 sentences per insight with multiple examples and quotes.'
    };
    
    const prompt = `STOP! You must analyze the REAL survey responses below. Do NOT write generic descriptions.

CONTENT DENSITY: ${densityInstructions[selectedDensity]}

I'm giving you actual survey data to analyze. You must read each response and extract REAL themes, quotes, and insights.

Survey Context: "${context}"

HERE ARE THE ACTUAL RESPONSES TO ANALYZE:
${responses.slice(0, 50).map((response, index) => `Response ${index + 1}: "${response}"`).join('\n')}

TASK: Read every response above. Find real patterns. Extract actual quotes. Identify genuine themes.

For example, if someone wrote "Communication is terrible, nobody tells us anything", you would put that as actual content, not "communication challenges identified".

If multiple people mention meetings, you would say "Several respondents mentioned meeting issues" and quote examples.

If people praise teamwork, you would quote what they actually said about teamwork.

Return this JSON with REAL analysis of the responses above:

{
  "surveyType": "Survey Results",
  "responseCount": ${responseCount},
  "pages": [
    {
      "title": "Survey Overview", 
      "type": "overview",
      "content": [
        {"title": "Total Responses", "value": "${responseCount}", "description": "Survey participants"}
      ]
    },
    {
      "title": "Main Themes",
      "type": "feedback", 
      "content": [
        {"title": "Theme 1", "content": "Write what you actually found in the responses - quote specific examples"},
        {"title": "Theme 2", "content": "Another real theme with actual quotes from responses"},
        {"title": "Theme 3", "content": "Third theme with real examples from the data"},
        {"title": "Theme 4", "content": "Fourth theme with actual response content"}
      ]
    },
    {
      "title": "Positive Feedback",
      "type": "feedback",
      "content": [
        {"title": "What People Like", "content": "Quote actual positive things people said"},
        {"title": "Strengths Mentioned", "content": "Real positive feedback from responses"},
        {"title": "Success Examples", "content": "Actual examples of what's working well"},
        {"title": "Appreciated Aspects", "content": "Things people specifically praised"}
      ]
    },
    {
      "title": "Issues & Concerns", 
      "type": "feedback",
      "content": [
        {"title": "Main Problems", "content": "Actual problems people mentioned with quotes"},
        {"title": "Common Complaints", "content": "Real issues that came up multiple times"},
        {"title": "Frustrations", "content": "Things people are frustrated about"},
        {"title": "Needs Improvement", "content": "Areas people said need work"}
      ]
    },
    {
      "title": "Key Insights",
      "type": "feedback",
      "content": [
        {"title": "Most Important Finding", "content": "The biggest insight from reading all responses"},
        {"title": "Surprising Discovery", "content": "Something unexpected you found in the data"},
        {"title": "Clear Pattern", "content": "An obvious pattern across multiple responses"},
        {"title": "Action Needed", "content": "What clearly needs to be done based on responses"}
      ]
    },
    {
      "title": "Thank You",
      "type": "thankyou",
      "content": []
    }
  ]
}

RULES:
- Quote actual things people wrote
- Don't say "participants expressed" - say what they actually expressed
- Don't say "areas identified" - say what the actual areas are
- Use real words from real responses
- If someone says "meetings are too long", write that, don't say "meeting duration concerns"
- Be specific and use actual content from the responses above
- Follow the content density requirement: ${densityInstructions[selectedDensity]}`;

    try {
        const response = await fetch(analyzeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                apiKey: localStorage.getItem('claude_api_key'),
                prompt: prompt,
                maxTokens: 4000, // Increased token limit for more comprehensive analysis
                action: 'analyze'
            })
        });
        
        const data = await response.json();
        const jsonMatch = data.completion.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        
        throw new Error('Could not parse Claude response');
        
    } catch (error) {
        console.error('Claude API error:', error);
        
        // Fallback structure with more comprehensive analysis
        return {
            surveyType: 'Team Feedback Survey',
            responseCount: responseCount,
            pages: [
                {
                    title: "Survey Overview",
                    type: "overview", 
                    content: [
                        {"title": "Total Responses", "value": responseCount.toString(), "description": "Survey participants"}
                    ]
                },
                {
                    title: "Key Themes",
                    type: "feedback",
                    content: [
                        {"title": "Main Theme", "content": `Primary pattern identified across ${responseCount} responses`},
                        {"title": "Common Feedback", "content": "Recurring themes in the survey data"},
                        {"title": "Notable Insights", "content": "Key observations from participant responses"}
                    ]
                },
                {
                    title: "Positive Feedback",
                    type: "feedback",
                    content: [
                        {"title": "Strengths", "content": "Areas where participants expressed satisfaction"},
                        {"title": "Success Areas", "content": "What's working well according to responses"}
                    ]
                },
                {
                    title: "Improvement Areas",
                    type: "feedback",
                    content: [
                        {"title": "Opportunities", "content": "Areas identified for enhancement"},
                        {"title": "Challenges", "content": "Common concerns raised by participants"}
                    ]
                },
                {
                    title: "Thank You",
                    type: "thankyou",
                    content: []
                }
            ]
        };
    }
}

// Utility functions
function compressData(data) {
    const jsonString = JSON.stringify(data);
    return btoa(encodeURIComponent(jsonString));
}

function copyShareLink() {
    const shareLink = document.getElementById('shareLink').textContent;
    navigator.clipboard.writeText(shareLink).then(() => {
        const copyBtn = document.querySelector('.copy-btn');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✅ Copied!';
        setTimeout(() => copyBtn.textContent = originalText, 2000);
    });
}

function previewPresentation() {
    const shareLink = document.getElementById('shareLink').textContent;
    window.open(shareLink, '_blank');
}

function resetAdmin() {
    document.getElementById('csvFile').value = '';
    document.getElementById('surveyContext').value = '';
    document.getElementById('generateBtn').disabled = true;
    document.getElementById('shareSection').style.display = 'none';
    document.getElementById('surveyContextSection').style.display = 'none';
    
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.innerHTML = `
        <div class="upload-icon">📊</div>
        <div class="upload-text">Drop your CSV file here</div>
        <div class="upload-subtext">or click to browse</div>
    `;
    
    surveyData = null;
    presentationData = null;
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    const savedKey = localStorage.getItem('claude_api_key');
    if (savedKey) {
        document.getElementById('claudeApiKey').value = savedKey;
        handleApiKeyInput();
    }
    
    // Initialize density selector to medium
    selectDensity('medium');
    
    // Drag and drop
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            document.getElementById('csvFile').files = files;
            handleFileUpload({ target: { files: files } });
        }
    });
});