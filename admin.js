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

// Generate Presentation
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
        
        // Generate shareable link - always use URL encoding for cross-device compatibility
        const compressedData = compressData(presentationData);
        const baseUrl = window.location.origin + window.location.pathname.replace('admin.html', 'index.html');
        const shareLink = `${baseUrl}?d=${compressedData}`;
        
        // Check if URL might be too long and warn user
        if (shareLink.length > 8000) {
            console.warn('Long URL detected, may cause issues on some platforms');
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
    
    const prompt = `Analyze these survey responses and create a professional presentation with real insights.

CONTENT DENSITY: ${densityInstructions[selectedDensity]}

Survey Context: "${context}"

SURVEY RESPONSES:
${responses.slice(0, 50).map((response, index) => `"${response}"`).join('\n')}

Create a presentation that analyzes and summarizes what you found. For each insight:
1. Write a clear analytical summary of the pattern/theme
2. Support it with specific examples or quotes from responses
3. Make it actionable and meaningful

GOOD EXAMPLE:
"Communication gaps are impacting team productivity. Multiple respondents highlighted issues with information flow, with comments like 'updates don't reach everyone' and 'we're often working with outdated information.' This suggests a need for more structured communication channels."

BAD EXAMPLE:
"Communication issues identified across responses"
OR
Just listing quotes: "'updates don't reach everyone' and 'we're working with outdated information'"

Create page titles based on what you actually discovered in the responses.

Return JSON format:

{
  "surveyType": "Descriptive title based on responses",
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
      "title": "Page title that reflects what you found",
      "type": "feedback", 
      "content": [
        {"title": "Insight title", "content": "Analytical summary explaining the finding, supported by examples like 'actual quote' and 'another quote.' Include what this means or suggests."},
        {"title": "Another insight", "content": "Clear analysis with supporting evidence from responses and interpretation."},
        {"title": "Third insight", "content": "Professional summary with quotes as evidence and actionable conclusion."}
      ]
    },
    {
      "title": "Another relevant page title",
      "type": "feedback",
      "content": [
        {"title": "Key finding", "content": "Analytical insight with quoted examples and clear interpretation."},
        {"title": "Important pattern", "content": "Summary of trend with supporting quotes and implications."},
        {"title": "Notable theme", "content": "Professional analysis with evidence and recommendations."}
      ]
    },
    {
      "title": "Third page title based on data",
      "type": "feedback",
      "content": [
        {"title": "Main conclusion", "content": "Thoughtful analysis with supporting examples and next steps."},
        {"title": "Key takeaway", "content": "Clear summary with evidence and actionable insights."}
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
- Analyze and summarize, don't just list quotes
- Support analysis with specific examples from responses
- Make insights actionable and meaningful
- Create relevant page titles based on what you found
- Balance analysis with evidence from actual responses`;

    try {
        const response = await fetch(analyzeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                apiKey: localStorage.getItem('claude_api_key'),
                prompt: prompt,
                maxTokens: 4000,
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
        
        // Even the fallback should have real content
        return {
            surveyType: 'Survey Analysis',
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
                    title: "Main Feedback",
                    type: "feedback",
                    content: [
                        {"title": "Direct Quote", "content": responses[0] || "No responses available"},
                        {"title": "Another Response", "content": responses[1] || "No additional responses"},
                        {"title": "Third Response", "content": responses[2] || "No more responses"}
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
    // Create a more compact version of the data
    const compactData = {
        st: data.surveyType || 'Survey',
        rc: data.responseCount || 0,
        p: (data.pages || []).map(page => ({
            t: page.title,
            ty: page.type,
            c: (page.content || []).map(item => ({
                t: item.title,
                c: item.content,
                v: item.value,
                d: item.description
            }))
        }))
    };
    
    const jsonString = JSON.stringify(compactData);
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
    document.getElementById('contentDensitySection').style.display = 'none';
    
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