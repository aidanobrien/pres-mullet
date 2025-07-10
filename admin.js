let surveyData = null;
let presentationData = null;

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
        
        // Generate shareable link
        const compressedData = compressData(presentationData);
        const baseUrl = window.location.origin + window.location.pathname.replace('admin.html', 'index.html');
        const shareLink = `${baseUrl}?d=${compressedData}`;
        
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
    
    const prompt = `You are creating a presentation from survey data.

Survey Context: "${context}"

Survey Responses (${responseCount} total):
${responses.slice(0, 30).map((response, index) => `${index + 1}. "${response}"`).join('\n')}

Create a presentation structure. The first slide will be a cover slide with a short, catchy title. The last slide will be a thank you slide. Return ONLY this JSON format:

{
  "surveyType": "Short catchy title (3-5 words max based on context)",
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
      "title": "Main Findings",
      "type": "feedback", 
      "content": [
        {"title": "Key Theme 1", "content": "Detailed analysis with examples"},
        {"title": "Key Theme 2", "content": "Another insight with examples"},
        {"title": "Key Theme 3", "content": "Third major theme with examples"}
      ]
    },
    {
      "title": "Thank You",
      "type": "thankyou",
      "content": []
    }
  ]
}

Requirements:
- Create a SHORT, catchy title (3-5 words maximum) based on the survey context
- The title should be presentation-ready and professional
- Overview should ONLY show response count (no analysis sections count or other metrics)
- Create 3-4 analysis slides with detailed insights (4-6 insights per slide)
- Make content detailed with specific examples of what people actually said
- Include multiple examples in each insight where possible
- End with a thank you page (type: "thankyou")
- Return ONLY the JSON, no other text`;

    try {
        const response = await fetch(analyzeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                apiKey: localStorage.getItem('claude_api_key'),
                prompt: prompt,
                maxTokens: 3500,
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
        
        // Fallback structure
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
                    title: "Key Feedback",
                    type: "feedback",
                    content: [
                        {"title": "Main Themes", "content": `Analysis of ${responseCount} survey responses: ${responses.slice(0, 3).join('. ')}`}
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