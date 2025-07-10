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
    
async function askClaudeForPresentationStructure(responses, context, responseCount) {
    const apiEndpoint = getApiEndpoint();
    const analyzeUrl = apiEndpoint.includes('netlify') ? apiEndpoint : `${apiEndpoint}/claude`;
    
    // Get content density instructions
    const densityInstructions = {
        'brief': 'Keep content very concise - 1-2 sentences per insight. Focus on key points only.',
        'medium': 'Provide moderate detail - 2-3 sentences per insight with some examples.',
        'detailed': 'Provide comprehensive analysis - 3-4 sentences per insight with multiple examples and quotes.'
    };
    
    const prompt = `You are analyzing REAL survey data. You must read every response and create RELEVANT pages based on what you actually find.

CONTENT DENSITY: ${densityInstructions[selectedDensity]}

Survey Context: "${context}"

ACTUAL SURVEY RESPONSES TO ANALYZE:
${responses.slice(0, 50).map((response, index) => `"${response}"`).join('\n')}

INSTRUCTIONS:
1. Read ALL the responses above carefully
2. Identify what type of survey this is based on the responses and context
3. Create page titles that make sense for THIS specific survey
4. Extract REAL quotes and patterns from the actual responses
5. Do NOT use generic analysis language

Based on what you find in the responses, create 4-5 relevant analysis pages. The page titles should match what you actually discovered.

For example:
- If it's about team collaboration → "Communication Gaps", "Team Strengths", "Process Issues"
- If it's about product feedback → "Feature Requests", "User Pain Points", "What Users Love"
- If it's about employee satisfaction → "Job Satisfaction", "Management Feedback", "Workplace Culture"
- If it's about training → "Learning Gaps", "Training Effectiveness", "Resource Needs"

Return this JSON with REAL analysis and RELEVANT page titles:

{
  "surveyType": "Brief descriptive title based on the responses",
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
      "title": "RELEVANT PAGE TITLE based on what you found",
      "type": "feedback", 
      "content": [
        {"title": "Specific finding", "content": "Actual insight with real quotes from responses"},
        {"title": "Another finding", "content": "Real pattern with examples from actual responses"},
        {"title": "Third finding", "content": "Genuine insight with quotes from the data"},
        {"title": "Fourth finding", "content": "Real observation with specific examples"}
      ]
    },
    {
      "title": "ANOTHER RELEVANT PAGE TITLE based on your analysis",
      "type": "feedback",
      "content": [
        {"title": "Real insight", "content": "Actual content from responses with quotes"},
        {"title": "Pattern found", "content": "Real theme with specific examples"},
        {"title": "Key observation", "content": "Genuine finding with response quotes"},
        {"title": "Important point", "content": "Real insight with actual examples"}
      ]
    },
    {
      "title": "THIRD RELEVANT PAGE TITLE based on what responses show",
      "type": "feedback",
      "content": [
        {"title": "Main point", "content": "Real finding with actual quotes"},
        {"title": "Key theme", "content": "Genuine pattern with examples"},
        {"title": "Notable insight", "content": "Actual observation with quotes"},
        {"title": "Critical finding", "content": "Real content from responses"}
      ]
    },
    {
      "title": "FOURTH RELEVANT PAGE TITLE based on analysis",
      "type": "feedback",
      "content": [
        {"title": "Final insight", "content": "Real conclusion with quotes"},
        {"title": "Action needed", "content": "Actual recommendation based on responses"},
        {"title": "Key takeaway", "content": "Genuine finding with examples"},
        {"title": "Summary point", "content": "Real insight from the data"}
      ]
    },
    {
      "title": "Thank You",
      "type": "thankyou",
      "content": []
    }
  ]
}

CRITICAL RULES:
- Page titles must be relevant to what you actually found in the responses
- Content must include real quotes and specific examples from the responses
- Do NOT write "Several respondents mentioned" - write what they actually said
- Do NOT write "Areas identified" - write the actual areas
- Do NOT write "Themes emerged" - write the actual themes
- Quote actual words and phrases from the responses
- Make every insight actionable and specific
- Base everything on the real data above`;

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