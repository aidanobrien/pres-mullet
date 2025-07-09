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
            
            // Show page builder section
            showPageBuilder();
            
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

function showPageBuilder() {
    const pageBuilderSection = document.getElementById('pageBuilderSection');
    pageBuilderSection.style.display = 'block';
    
    // Initialize with default pages
    initializeDefaultPages();
    
    // Scroll to page builder
    pageBuilderSection.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
    });
}

function initializeDefaultPages() {
    const pagesContainer = document.getElementById('pagesContainer');
    pagesContainer.innerHTML = '';
    
    // Initialize pages array - start empty, let admin build structure
    window.presentationPages = [];
    
    // Add one empty page to get started
    addPageCard({
        title: 'Page 1',
        type: 'feedback',
        instruction: 'Tell me what to extract from the CSV...'
    });
}

function addNewPage() {
    addPageCard({
        title: 'New Page',
        type: 'feedback',
        instruction: 'Tell me what to extract from the CSV...'
    });
}

function addPageCard(pageData = {}) {
    const pagesContainer = document.getElementById('pagesContainer');
    const pageIndex = pagesContainer.children.length;
    
    const pageCard = document.createElement('div');
    pageCard.className = 'page-card';
    pageCard.draggable = true;
    pageCard.dataset.pageIndex = pageIndex;
    
    pageCard.innerHTML = `
        <div class="page-header">
            <div class="page-title">
                <span class="page-number">${pageIndex + 1}</span>
                <span>Page ${pageIndex + 1}</span>
                <span class="page-type-indicator page-type-${pageData.type || 'feedback'}">${pageData.type || 'feedback'}</span>
            </div>
            <div class="page-controls">
                <span class="drag-handle" title="Drag to reorder">⋮⋮</span>
                <button type="button" class="delete-page-btn" onclick="deletePage(${pageIndex})" title="Delete page">🗑️</button>
            </div>
        </div>
        
        <div class="page-content-inputs">
            <div class="input-row">
                <label>Page Title:</label>
                <input type="text" value="${pageData.title || ''}" placeholder="e.g. What's Working Well" onchange="updatePageData(${pageIndex})">
            </div>
            
            <div class="input-row">
                <label>Page Type:</label>
                <select onchange="updatePageData(${pageIndex})">
                    <option value="feedback" ${pageData.type === 'feedback' ? 'selected' : ''}>Text Feedback</option>
                    <option value="ratings" ${pageData.type === 'ratings' ? 'selected' : ''}>Ratings/Scores</option>
                    <option value="overview" ${pageData.type === 'overview' ? 'selected' : ''}>Overview/Stats</option>
                    <option value="insights" ${pageData.type === 'insights' ? 'selected' : ''}>Key Insights</option>
                    <option value="custom" ${pageData.type === 'custom' ? 'selected' : ''}>Custom Content</option>
                </select>
            </div>
            
            <div class="input-row">
                <label>Instructions:</label>
                <textarea placeholder="Tell me what to extract from the CSV for this page..." onchange="updatePageData(${pageIndex})">${pageData.instruction || ''}</textarea>
            </div>
        </div>
        
        ${surveyData ? `
            <div class="csv-columns-hint">
                <strong>Available CSV columns:</strong>
                <div class="csv-columns-list">
                    ${surveyData.headers.slice(0, 10).map(header => `
                        <span class="csv-column-tag">${escapeHtml(header)}</span>
                    `).join('')}
                    ${surveyData.headers.length > 10 ? '<span class="csv-column-tag">...</span>' : ''}
                </div>
            </div>
        ` : ''}
    `;
    
    pagesContainer.appendChild(pageCard);
    
    // Add drag and drop functionality
    addDragAndDropListeners(pageCard);
    
    // Store initial page data
    updatePageData(pageIndex);
}

function updatePageData(pageIndex) {
    const pageCard = document.querySelector(`[data-page-index="${pageIndex}"]`);
    if (!pageCard) return;
    
    const inputs = pageCard.querySelectorAll('input, select, textarea');
    const pageData = {
        title: inputs[0].value,
        type: inputs[1].value,
        instruction: inputs[2].value
    };
    
    // Update the visual indicator
    const typeIndicator = pageCard.querySelector('.page-type-indicator');
    if (typeIndicator) {
        typeIndicator.className = `page-type-indicator page-type-${pageData.type}`;
        typeIndicator.textContent = pageData.type;
    }
    
    // Store in global pages array
    if (!window.presentationPages) window.presentationPages = [];
    window.presentationPages[pageIndex] = pageData;
}

function deletePage(pageIndex) {
    const pagesContainer = document.getElementById('pagesContainer');
    const pageCard = pagesContainer.querySelector(`[data-page-index="${pageIndex}"]`);
    
    if (pagesContainer.children.length <= 1) {
        alert('You need at least one page in your presentation.');
        return;
    }
    
    if (pageCard) {
        pageCard.remove();
        renumberPages();
        
        // Remove from pages array
        if (window.presentationPages) {
            window.presentationPages.splice(pageIndex, 1);
        }
    }
}

function renumberPages() {
    const pagesContainer = document.getElementById('pagesContainer');
    Array.from(pagesContainer.children).forEach((pageCard, index) => {
        pageCard.dataset.pageIndex = index;
        
        // Update page number display
        const pageNumber = pageCard.querySelector('.page-number');
        const pageTitle = pageCard.querySelector('.page-title span:nth-child(2)');
        
        if (pageNumber) pageNumber.textContent = index + 1;
        if (pageTitle) pageTitle.textContent = `Page ${index + 1}`;
        
        // Update delete button onclick
        const deleteBtn = pageCard.querySelector('.delete-page-btn');
        if (deleteBtn) deleteBtn.setAttribute('onclick', `deletePage(${index})`);
        
        // Update input change handlers
        const inputs = pageCard.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.setAttribute('onchange', `updatePageData(${index})`);
        });
    });
}

function addDragAndDropListeners(pageCard) {
    pageCard.addEventListener('dragstart', function(e) {
        e.dataTransfer.setData('text/plain', pageCard.dataset.pageIndex);
        pageCard.classList.add('dragging');
    });
    
    pageCard.addEventListener('dragend', function() {
        pageCard.classList.remove('dragging');
    });
    
    pageCard.addEventListener('dragover', function(e) {
        e.preventDefault();
    });
    
    pageCard.addEventListener('drop', function(e) {
        e.preventDefault();
        const draggedIndex = e.dataTransfer.getData('text/plain');
        const dropIndex = pageCard.dataset.pageIndex;
        
        if (draggedIndex !== dropIndex) {
            reorderPages(parseInt(draggedIndex), parseInt(dropIndex));
        }
    });
}

function reorderPages(fromIndex, toIndex) {
    const pagesContainer = document.getElementById('pagesContainer');
    const pages = Array.from(pagesContainer.children);
    
    // Move the DOM element
    const draggedPage = pages[fromIndex];
    if (toIndex < fromIndex) {
        pagesContainer.insertBefore(draggedPage, pages[toIndex]);
    } else {
        pagesContainer.insertBefore(draggedPage, pages[toIndex].nextSibling);
    }
    
    // Move the data
    if (window.presentationPages) {
        const draggedData = window.presentationPages.splice(fromIndex, 1)[0];
        window.presentationPages.splice(toIndex, 0, draggedData);
    }
    
    // Renumber everything
    renumberPages();
}

function previewStructure() {
    const pages = window.presentationPages || [];
    
    if (pages.length === 0) {
        alert('Please add at least one page to preview.');
        return;
    }
    
    const preview = pages.map((page, index) => 
        `${index + 1}. ${page.title} (${page.type})\n   → ${page.instruction}`
    ).join('\n\n');
    
    alert('Presentation Structure:\n\n' + preview);
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
    const pages = window.presentationPages || [];
    
    if (pages.length === 0) {
        throw new Error('No presentation pages defined');
    }
    
    // Generate content for each custom page
    const presentationData = {
        responseCount: data.data.length,
        surveyType: 'Custom Survey',
        pages: []
    };
    
    pages.forEach((pageConfig, index) => {
        const pageData = generateCustomPageContent(pageConfig, data);
        presentationData.pages.push(pageData);
    });
    
    return presentationData;
}

function generateCustomPageContent(pageConfig, data) {
    const { title, type, instruction } = pageConfig;
    
    switch (type) {
        case 'overview':
            return generateOverviewPageFromInstruction(title, instruction, data);
        case 'ratings':
            return generateRatingsPageFromInstruction(title, instruction, data);
        case 'feedback':
            return generateFeedbackPageFromInstruction(title, instruction, data);
        case 'insights':
            return generateInsightsPageFromInstruction(title, instruction, data);
        case 'custom':
            return generateCustomPageFromInstruction(title, instruction, data);
        default:
            return generateFeedbackPageFromInstruction(title, instruction, data);
    }
}

function generateOverviewPageFromInstruction(title, instruction, data) {
    const stats = [];
    
    // Always include response count
    stats.push({
        title: "Total Responses",
        value: data.data.length,
        description: "Survey participants"
    });
    
    // Parse instruction for specific metrics to calculate
    const instructionLower = instruction.toLowerCase();
    
    // Look for completion rate requests
    if (instructionLower.includes('completion') || instructionLower.includes('complete')) {
        const completionRate = calculateCompletionRate(data);
        stats.push({
            title: "Completion Rate",
            value: `${completionRate}%`,
            description: "Responses completed"
        });
    }
    
    // Look for average ratings
    if (instructionLower.includes('rating') || instructionLower.includes('score') || instructionLower.includes('average')) {
        const ratingColumns = findRatingColumns(data.headers);
        if (ratingColumns.length > 0) {
            const avgRating = calculateAverageRating(data, ratingColumns[0]);
            stats.push({
                title: "Average Rating",
                value: avgRating.toFixed(1),
                description: `Based on ${ratingColumns[0]}`
            });
        }
    }
    
    return {
        title: title,
        type: "overview",
        content: stats
    };
}

function generateRatingsPageFromInstruction(title, instruction, data) {
    const content = [];
    const instructionLower = instruction.toLowerCase();
    
    // Find rating/numeric columns
    const ratingColumns = findRatingColumns(data.headers);
    
    // Also look for specific column names mentioned in instruction
    const mentionedColumns = data.headers.filter(header => 
        instructionLower.includes(header.toLowerCase())
    );
    
    const columnsToAnalyze = [...new Set([...ratingColumns, ...mentionedColumns])];
    
    columnsToAnalyze.slice(0, 6).forEach(column => {
        const values = data.data
            .map(row => row[column])
            .filter(val => val && val.trim() && !isNaN(parseFloat(val)));
        
        if (values.length > 0) {
            const average = values.reduce((a, b) => a + parseFloat(b), 0) / values.length;
            content.push({
                title: truncateText(column, 40),
                value: average.toFixed(1),
                description: `Average from ${values.length} responses`
            });
        }
    });
    
    return {
        title: title,
        type: "ratings",
        content: content
    };
}

function generateFeedbackPageFromInstruction(title, instruction, data) {
    const content = [];
    const instructionLower = instruction.toLowerCase();
    
    // Find relevant columns based on instruction
    const relevantColumns = findRelevantColumnsFromInstruction(data.headers, instruction);
    
    // Extract and analyze all relevant responses
    const allResponses = [];
    relevantColumns.forEach(column => {
        const responses = data.data
            .map(row => row[column])
            .filter(val => val && val.trim() && val.length > 10);
        allResponses.push(...responses);
    });
    
    if (allResponses.length === 0) {
        return {
            title: title,
            type: "feedback",
            content: [{
                title: "No Data Found",
                content: "No relevant responses found for the specified criteria."
            }]
        };
    }
    
    // Analyze and summarize the responses
    const analysis = analyzeTextResponses(allResponses, instruction);
    
    return {
        title: title,
        type: "feedback",
        content: analysis
    };
}

function analyzeTextResponses(responses, instruction) {
    if (responses.length === 0) return [];
    
    // ACTUALLY read the responses and create real summaries
    const realAnalysis = createActualSummaries(responses, instruction);
    
    return realAnalysis;
}

function createActualSummaries(responses, instruction) {
    const summaries = [];
    
    // Group responses by actual content similarity
    const contentGroups = groupResponsesByContent(responses);
    
    // For each group, create a real summary of what people actually said
    contentGroups.forEach((group, index) => {
        if (summaries.length >= 6) return;
        
        const summary = summarizeResponseGroup(group);
        if (summary) {
            summaries.push({
                title: summary.title,
                content: summary.content
            });
        }
    });
    
    return summaries;
}

function groupResponsesByContent(responses) {
    // Simple but effective content grouping
    const groups = [];
    const processed = new Set();
    
    responses.forEach((response, index) => {
        if (processed.has(index)) return;
        
        const group = [response];
        const mainWords = extractKeyWords(response);
        
        // Find similar responses
        responses.forEach((otherResponse, otherIndex) => {
            if (otherIndex === index || processed.has(otherIndex)) return;
            
            const otherWords = extractKeyWords(otherResponse);
            const overlap = calculateWordOverlap(mainWords, otherWords);
            
            // If responses share key concepts, group them
            if (overlap > 0.3 || sharesSimilarSentiment(response, otherResponse)) {
                group.push(otherResponse);
                processed.add(otherIndex);
            }
        });
        
        processed.add(index);
        
        // Only include groups with substantial content
        if (group.length >= 1) {
            groups.push(group);
        }
    });
    
    // Sort by group size (most common themes first)
    return groups.sort((a, b) => b.length - a.length);
}

function extractKeyWords(text) {
    return text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !isStopWord(word))
        .slice(0, 10); // Top 10 key words
}

function calculateWordOverlap(words1, words2) {
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    return intersection.length / union.length;
}

function sharesSimilarSentiment(text1, text2) {
    const positiveWords = ['good', 'great', 'excellent', 'love', 'like', 'helpful', 'easy', 'clear'];
    const negativeWords = ['bad', 'poor', 'difficult', 'confusing', 'frustrating', 'problem', 'issue'];
    
    const sentiment1 = getSentiment(text1, positiveWords, negativeWords);
    const sentiment2 = getSentiment(text2, positiveWords, negativeWords);
    
    return sentiment1 === sentiment2 && sentiment1 !== 'neutral';
}

function getSentiment(text, positiveWords, negativeWords) {
    const textLower = text.toLowerCase();
    const posCount = positiveWords.filter(word => textLower.includes(word)).length;
    const negCount = negativeWords.filter(word => textLower.includes(word)).length;
    
    if (posCount > negCount) return 'positive';
    if (negCount > posCount) return 'negative';
    return 'neutral';
}

function summarizeResponseGroup(responseGroup) {
    if (responseGroup.length === 0) return null;
    
    // Find the main topic/theme from this group
    const allText = responseGroup.join(' ').toLowerCase();
    const keyWords = extractKeyWords(allText);
    
    // Determine if this is positive, negative, or neutral feedback
    const sentiment = getSentiment(allText, 
        ['good', 'great', 'excellent', 'love', 'like', 'helpful', 'easy', 'clear', 'useful', 'satisfied'],
        ['bad', 'poor', 'difficult', 'confusing', 'frustrating', 'problem', 'issue', 'slow', 'hard']
    );
    
    // Create a meaningful title based on actual content
    const title = generateTitleFromContent(responseGroup, keyWords, sentiment);
    
    // Create summary based on what people actually said
    const content = generateContentSummary(responseGroup, sentiment);
    
    return { title, content };
}

function generateTitleFromContent(responses, keyWords, sentiment) {
    // Look for specific topics mentioned
    const topics = {
        'communication': ['communication', 'communicate', 'talk', 'discuss', 'meeting', 'email'],
        'speed': ['speed', 'fast', 'slow', 'quick', 'time', 'wait'],
        'usability': ['easy', 'difficult', 'hard', 'simple', 'complex', 'user', 'interface'],
        'support': ['help', 'support', 'assist', 'guidance', 'training'],
        'quality': ['quality', 'good', 'bad', 'excellent', 'poor', 'reliable'],
        'features': ['feature', 'function', 'tool', 'capability', 'option']
    };
    
    // Find which topic is most relevant
    let mainTopic = 'General Feedback';
    let maxMatches = 0;
    
    Object.entries(topics).forEach(([topic, keywords]) => {
        const matches = keywords.filter(keyword => 
            keyWords.some(keyWord => keyWord.includes(keyword) || keyword.includes(keyWord))
        ).length;
        
        if (matches > maxMatches) {
            maxMatches = matches;
            mainTopic = topic.charAt(0).toUpperCase() + topic.slice(1);
        }
    });
    
    // Add sentiment context if clear
    if (sentiment === 'positive' && maxMatches > 0) {
        return `${mainTopic} Strengths`;
    } else if (sentiment === 'negative' && maxMatches > 0) {
        return `${mainTopic} Concerns`;
    }
    
    return mainTopic;
}

function generateContentSummary(responses, sentiment) {
    const count = responses.length;
    
    if (count === 1) {
        // Single response - create a concise version
        const response = responses[0];
        if (response.length <= 100) {
            return response;
        }
        // Extract the key sentence or phrase
        const sentences = response.split(/[.!?]+/);
        const mainSentence = sentences.find(s => s.trim().length > 20) || sentences[0];
        return mainSentence.trim() + (sentences.length > 1 ? '...' : '');
    }
    
    // Multiple responses - find common themes in what people actually said
    const commonPhrases = findCommonPhrases(responses);
    const sharedConcerns = findSharedConcerns(responses);
    
    if (commonPhrases.length > 0) {
        const mainPhrase = commonPhrases[0];
        return `${count} people mentioned similar points about ${mainPhrase.toLowerCase()}. ${getRepresentativeExample(responses, mainPhrase)}`;
    }
    
    if (sharedConcerns.length > 0) {
        return `${count} responses highlight ${sharedConcerns[0]}. ${getRepresentativeExample(responses)}`;
    }
    
    // Fallback - find the most substantial response as representative
    const longestResponse = responses.reduce((longest, current) => 
        current.length > longest.length ? current : longest
    );
    
    return `${count} similar responses. Key point: ${longestResponse.substring(0, 150)}${longestResponse.length > 150 ? '...' : ''}`;
}

function findCommonPhrases(responses) {
    const phrases = [];
    
    responses.forEach(response => {
        // Extract meaningful phrases (3-6 words)
        const words = response.toLowerCase().split(/\s+/);
        for (let i = 0; i < words.length - 2; i++) {
            const phrase = words.slice(i, i + 3).join(' ');
            if (phrase.length > 10 && !isStopPhrase(phrase)) {
                phrases.push(phrase);
            }
        }
    });
    
    // Count phrase frequency
    const phraseCount = {};
    phrases.forEach(phrase => {
        phraseCount[phrase] = (phraseCount[phrase] || 0) + 1;
    });
    
    // Return phrases mentioned by multiple people
    return Object.entries(phraseCount)
        .filter(([phrase, count]) => count >= 2)
        .sort(([,a], [,b]) => b - a)
        .map(([phrase]) => phrase);
}

function findSharedConcerns(responses) {
    const concerns = [];
    const concernWords = ['issue', 'problem', 'concern', 'difficulty', 'challenge', 'trouble'];
    
    responses.forEach(response => {
        concernWords.forEach(word => {
            if (response.toLowerCase().includes(word)) {
                // Extract context around the concern word
                const words = response.toLowerCase().split(/\s+/);
                const index = words.indexOf(word);
                if (index > 0) {
                    const context = words.slice(Math.max(0, index - 2), index + 3).join(' ');
                    concerns.push(context);
                }
            }
        });
    });
    
    return [...new Set(concerns)];
}

function getRepresentativeExample(responses, topic = '') {
    // Find the clearest, most complete response
    let bestResponse = '';
    let bestScore = 0;
    
    responses.forEach(response => {
        let score = 0;
        
        // Prefer responses that mention the topic
        if (topic && response.toLowerCase().includes(topic.toLowerCase())) {
            score += 3;
        }
        
        // Prefer complete sentences
        if (response.includes('.') || response.includes('!')) {
            score += 2;
        }
        
        // Prefer medium length (not too short, not too long)
        if (response.length >= 50 && response.length <= 200) {
            score += 2;
        }
        
        // Prefer responses that explain rather than just state
        if (response.includes('because') || response.includes('since') || response.includes('when')) {
            score += 1;
        }
        
        if (score > bestScore) {
            bestScore = score;
            bestResponse = response;
        }
    });
    
    return bestResponse.length > 120 ? bestResponse.substring(0, 120) + '...' : bestResponse;
}

function isStopPhrase(phrase) {
    const stopPhrases = ['i think that', 'it would be', 'there are some', 'i would like', 'it is important'];
    return stopPhrases.some(stop => phrase.includes(stop));
}

function synthesizeInsights(responses, instruction) {
    const insights = [];
    const instructionLower = instruction.toLowerCase();
    
    // 1. Analyze for improvement opportunities
    const improvements = analyzeForImprovements(responses);
    improvements.forEach(improvement => {
        insights.push({
            title: improvement.area,
            content: improvement.insight,
            actionable: true
        });
    });
    
    // 2. Identify strengths and what's working
    const strengths = analyzeForStrengths(responses);
    strengths.forEach(strength => {
        insights.push({
            title: strength.area,
            content: strength.insight,
            actionable: false
        });
    });
    
    // 3. Detect patterns and trends
    const patterns = detectPatterns(responses);
    patterns.forEach(pattern => {
        insights.push({
            title: pattern.title,
            content: pattern.insight,
            trend: true
        });
    });
    
    // 4. Generate strategic recommendations
    const recommendations = generateRecommendations(responses, instruction);
    recommendations.forEach(rec => {
        insights.push({
            title: rec.title,
            content: rec.insight,
            strategic: true
        });
    });
    
    return insights.slice(0, 6);
}

function analyzeForImprovements(responses) {
    const improvements = [];
    
    // Analyze language patterns for improvement signals
    const improvementSignals = [
        { keywords: ['slow', 'delay', 'wait', 'time', 'quick', 'faster'], area: 'Speed & Efficiency', type: 'process' },
        { keywords: ['confus', 'unclear', 'understand', 'explain', 'clarif'], area: 'Communication Clarity', type: 'communication' },
        { keywords: ['difficult', 'hard', 'complicated', 'complex', 'simpl'], area: 'User Experience', type: 'usability' },
        { keywords: ['train', 'learn', 'help', 'support', 'guid'], area: 'Training & Support', type: 'education' },
        { keywords: ['feature', 'missing', 'add', 'need', 'would like'], area: 'Feature Gaps', type: 'functionality' },
        { keywords: ['bug', 'error', 'problem', 'issue', 'fail'], area: 'Quality Issues', type: 'reliability' }
    ];
    
    improvementSignals.forEach(signal => {
        const relevantResponses = responses.filter(response => 
            signal.keywords.some(keyword => 
                response.toLowerCase().includes(keyword)
            )
        );
        
        if (relevantResponses.length >= 2) {
            const insight = generateImprovementInsight(signal, relevantResponses, responses.length);
            if (insight) improvements.push(insight);
        }
    });
    
    return improvements;
}

function generateImprovementInsight(signal, relevantResponses, totalResponses) {
    const percentage = Math.round((relevantResponses.length / totalResponses) * 100);
    const severity = relevantResponses.length >= totalResponses * 0.3 ? 'significant' : 'moderate';
    
    let insight = '';
    
    switch (signal.type) {
        case 'process':
            insight = `Speed and efficiency concerns affect ${percentage}% of users. Consider streamlining workflows and optimizing response times to improve user satisfaction.`;
            break;
        case 'communication':
            insight = `${percentage}% of feedback indicates communication clarity issues. Implementing clearer documentation and standardized communication protocols could significantly improve user experience.`;
            break;
        case 'usability':
            insight = `Usability challenges impact ${percentage}% of users. Simplifying interfaces and improving user journey design should be prioritized to reduce friction.`;
            break;
        case 'education':
            insight = `${percentage}% of responses suggest training or support gaps. Developing comprehensive onboarding materials and self-service resources could reduce support burden while improving user success.`;
            break;
        case 'functionality':
            insight = `Feature requests appear in ${percentage}% of feedback. Conducting user research to prioritize missing functionality could drive engagement and satisfaction.`;
            break;
        case 'reliability':
            insight = `Quality concerns mentioned by ${percentage}% of users represent a ${severity} risk to user trust. Implementing robust testing and quality assurance processes is critical.`;
            break;
        default:
            insight = `${signal.area} issues affect ${percentage}% of users and should be addressed to improve overall experience.`;
    }
    
    return {
        area: signal.area,
        insight: insight,
        severity: severity,
        percentage: percentage
    };
}

function analyzeForStrengths(responses) {
    const strengths = [];
    
    const strengthSignals = [
        { keywords: ['easy', 'simple', 'intuitive', 'straightforward'], area: 'Ease of Use', type: 'usability' },
        { keywords: ['fast', 'quick', 'rapid', 'efficient', 'speed'], area: 'Performance', type: 'efficiency' },
        { keywords: ['helpful', 'support', 'assist', 'responsive'], area: 'Customer Support', type: 'service' },
        { keywords: ['love', 'great', 'excellent', 'amazing', 'perfect'], area: 'User Satisfaction', type: 'satisfaction' },
        { keywords: ['reliable', 'stable', 'consistent', 'dependable'], area: 'Reliability', type: 'quality' },
        { keywords: ['useful', 'valuable', 'benefit', 'solve'], area: 'Value Proposition', type: 'impact' }
    ];
    
    strengthSignals.forEach(signal => {
        const relevantResponses = responses.filter(response => 
            signal.keywords.some(keyword => 
                response.toLowerCase().includes(keyword)
            )
        );
        
        if (relevantResponses.length >= 2) {
            const insight = generateStrengthInsight(signal, relevantResponses, responses.length);
            if (insight) strengths.push(insight);
        }
    });
    
    return strengths;
}

function generateStrengthInsight(signal, relevantResponses, totalResponses) {
    const percentage = Math.round((relevantResponses.length / totalResponses) * 100);
    const strength_level = percentage >= 40 ? 'major competitive advantage' : percentage >= 20 ? 'strong asset' : 'positive indicator';
    
    let insight = '';
    
    switch (signal.type) {
        case 'usability':
            insight = `Ease of use is a ${strength_level} with ${percentage}% positive mentions. This intuitive design should be maintained and leveraged as a key differentiator in marketing.`;
            break;
        case 'efficiency':
            insight = `Performance excellence noted by ${percentage}% of users represents a ${strength_level}. Continue investing in speed optimizations to maintain this competitive edge.`;
            break;
        case 'service':
            insight = `Customer support quality recognized by ${percentage}% of users is a ${strength_level}. This strength can drive customer retention and referrals.`;
            break;
        case 'satisfaction':
            insight = `High satisfaction levels from ${percentage}% of users indicate strong product-market fit. Focus on scaling these positive experiences to drive growth.`;
            break;
        case 'quality':
            insight = `Reliability praised by ${percentage}% of users builds trust and reduces churn risk. This foundation enables confident expansion of features and services.`;
            break;
        case 'impact':
            insight = `Value recognition from ${percentage}% of users validates the core proposition. Amplify these benefits in customer success stories and product positioning.`;
            break;
        default:
            insight = `${signal.area} strength recognized by ${percentage}% of users should be leveraged for competitive advantage.`;
    }
    
    return {
        area: signal.area,
        insight: insight,
        strength_level: strength_level,
        percentage: percentage
    };
}

function detectPatterns(responses) {
    const patterns = [];
    
    // Analyze response patterns for business insights
    
    // 1. Urgency patterns
    const urgentLanguage = responses.filter(r => 
        /urgent|asap|immediately|critical|emergency|now/i.test(r)
    ).length;
    
    if (urgentLanguage >= 2) {
        const urgencyRate = Math.round((urgentLanguage / responses.length) * 100);
        patterns.push({
            title: 'Urgency Pattern',
            insight: `${urgencyRate}% of feedback contains urgent language, suggesting time-sensitive issues requiring immediate attention and faster response protocols.`
        });
    }
    
    // 2. Comparison patterns (mentions of competitors or alternatives)
    const comparisons = responses.filter(r => 
        /compared to|better than|like|similar|instead|alternative/i.test(r)
    ).length;
    
    if (comparisons >= 2) {
        const comparisonRate = Math.round((comparisons / responses.length) * 100);
        patterns.push({
            title: 'Competitive Context',
            insight: `${comparisonRate}% of responses include comparisons, indicating users are actively evaluating alternatives. Strengthening unique value propositions is recommended.`
        });
    }
    
    // 3. Future intent patterns
    const futureIntent = responses.filter(r => 
        /will|plan|going to|next|future|soon|continue/i.test(r)
    ).length;
    
    if (futureIntent >= 3) {
        const intentRate = Math.round((futureIntent / responses.length) * 100);
        patterns.push({
            title: 'Future Engagement',
            insight: `${intentRate}% of responses indicate future planning or continued engagement, suggesting strong user retention potential and growth opportunities.`
        });
    }
    
    return patterns;
}

function generateRecommendations(responses, instruction) {
    const recommendations = [];
    
    // Generate strategic recommendations based on overall response analysis
    const totalResponses = responses.length;
    const avgResponseLength = responses.reduce((acc, r) => acc + r.length, 0) / totalResponses;
    
    // Recommendation based on engagement level
    if (avgResponseLength > 200) {
        recommendations.push({
            title: 'High Engagement Opportunity',
            insight: `Detailed feedback (avg ${Math.round(avgResponseLength)} characters) indicates highly engaged users. Consider implementing a feedback loop program to harness this engagement for product development and community building.`
        });
    }
    
    // Recommendation based on response diversity
    const uniqueWords = new Set();
    responses.forEach(r => {
        r.toLowerCase().split(/\s+/).forEach(word => {
            if (word.length > 3) uniqueWords.add(word);
        });
    });
    
    const vocabulary_diversity = uniqueWords.size / totalResponses;
    if (vocabulary_diversity > 10) {
        recommendations.push({
            title: 'Diverse User Needs',
            insight: `High vocabulary diversity suggests varied user segments with different needs. Implement user segmentation analysis to create targeted experiences and personalized solutions.`
        });
    }
    
    // Strategic recommendation based on instruction context
    if (instruction.toLowerCase().includes('improve')) {
        recommendations.push({
            title: 'Improvement Strategy',
            insight: `Focus on systematic improvement tracking with regular pulse surveys to measure progress. Establish clear metrics and communicate changes back to users to demonstrate responsiveness.`
        });
    }
    
    return recommendations;
}

function categorizeBySentiment(responses) {
    const positive = [];
    const negative = [];
    const neutral = [];
    
    // Simple sentiment detection based on keywords
    const positiveWords = ['good', 'great', 'excellent', 'love', 'like', 'amazing', 'helpful', 'easy', 'clear', 'effective', 'satisfied', 'happy', 'impressed'];
    const negativeWords = ['bad', 'poor', 'terrible', 'hate', 'dislike', 'difficult', 'hard', 'confusing', 'frustrating', 'problem', 'issue', 'slow', 'complicated'];
    
    responses.forEach(response => {
        const responseLower = response.toLowerCase();
        const positiveScore = positiveWords.reduce((score, word) => 
            score + (responseLower.includes(word) ? 1 : 0), 0);
        const negativeScore = negativeWords.reduce((score, word) => 
            score + (responseLower.includes(word) ? 1 : 0), 0);
        
        if (positiveScore > negativeScore) {
            positive.push(response);
        } else if (negativeScore > positiveScore) {
            negative.push(response);
        } else {
            neutral.push(response);
        }
    });
    
    return {
        positive: createSummariesFromGroup(positive, 'positive'),
        negative: createSummariesFromGroup(negative, 'negative'),
        neutral: createSummariesFromGroup(neutral, 'neutral')
    };
}

function createSummariesFromGroup(responses, type) {
    if (responses.length === 0) return [];
    
    // Group similar responses
    const themes = extractThemesFromResponses(responses);
    
    return themes.map(theme => ({
        summary: `${theme.count} people mentioned ${theme.title.toLowerCase()}: "${theme.examples[0].substring(0, 100)}..."`,
        count: theme.count,
        type: type
    }));
}

function createThemeSummary(theme, allResponses) {
    // Find responses related to this theme
    const relatedResponses = allResponses.filter(response => 
        response.toLowerCase().includes(theme.title.toLowerCase())
    );
    
    if (relatedResponses.length === 0) return `${theme.count} mentions of ${theme.title}`;
    
    // Create a smart summary
    const commonPatterns = findCommonPatterns(relatedResponses, theme.title);
    
    if (commonPatterns.length > 0) {
        return `${theme.count} people mentioned ${theme.title}: ${commonPatterns[0]}`;
    }
    
    // Fallback to first example with context
    const firstExample = relatedResponses[0];
    const contextStart = Math.max(0, firstExample.toLowerCase().indexOf(theme.title.toLowerCase()) - 20);
    const contextEnd = Math.min(firstExample.length, contextStart + 120);
    
    return `${theme.count} mentions: "${firstExample.substring(contextStart, contextEnd)}"`;
}

function findCommonPatterns(responses, keyword) {
    // Look for common phrases that appear with the keyword
    const patterns = [];
    const keywordLower = keyword.toLowerCase();
    
    responses.forEach(response => {
        const responseLower = response.toLowerCase();
        const keywordIndex = responseLower.indexOf(keywordLower);
        
        if (keywordIndex !== -1) {
            // Extract context around the keyword
            const start = Math.max(0, keywordIndex - 30);
            const end = Math.min(response.length, keywordIndex + keyword.length + 50);
            const context = response.substring(start, end).trim();
            
            // Look for common sentence structures
            const sentences = context.split(/[.!?]+/);
            sentences.forEach(sentence => {
                if (sentence.includes(keyword) && sentence.trim().length > 20) {
                    patterns.push(sentence.trim());
                }
            });
        }
    });
    
    // Find most common pattern
    const patternFreq = {};
    patterns.forEach(pattern => {
        // Normalize pattern for comparison
        const normalized = pattern.toLowerCase().replace(/[^\w\s]/g, ' ').trim();
        patternFreq[normalized] = (patternFreq[normalized] || 0) + 1;
    });
    
    const sortedPatterns = Object.entries(patternFreq)
        .sort(([,a], [,b]) => b - a)
        .map(([pattern]) => pattern);
    
    return sortedPatterns.slice(0, 3);
}

function createFrequencySummaries(responses) {
    // Create summaries based on response frequency and content
    const summaries = [];
    
    // Group responses by similarity (very basic clustering)
    const clusters = clusterSimilarResponses(responses);
    
    clusters.forEach((cluster, index) => {
        if (cluster.responses.length >= 2) { // Only include if mentioned by multiple people
            const representative = cluster.responses[0];
            summaries.push({
                title: `Common Response ${index + 1}`,
                content: `${cluster.responses.length} people mentioned: "${representative.substring(0, 150)}${representative.length > 150 ? '...' : ''}"`,
                count: cluster.responses.length
            });
        }
    });
    
    return summaries;
}

function clusterSimilarResponses(responses) {
    // Very simple clustering based on common words
    const clusters = [];
    const used = new Set();
    
    responses.forEach((response, index) => {
        if (used.has(index)) return;
        
        const cluster = { responses: [response], indices: [index] };
        const responseWords = response.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        
        // Find similar responses
        responses.forEach((otherResponse, otherIndex) => {
            if (otherIndex <= index || used.has(otherIndex)) return;
            
            const otherWords = otherResponse.toLowerCase().split(/\s+/).filter(w => w.length > 3);
            const commonWords = responseWords.filter(w => otherWords.includes(w));
            
            // If they share significant words, cluster them
            if (commonWords.length >= Math.min(3, Math.min(responseWords.length, otherWords.length) * 0.3)) {
                cluster.responses.push(otherResponse);
                cluster.indices.push(otherIndex);
                used.add(otherIndex);
            }
        });
        
        used.add(index);
        clusters.push(cluster);
    });
    
    return clusters.sort((a, b) => b.responses.length - a.responses.length);
}

function generateInsightsPageFromInstruction(title, instruction, data) {
    const content = [];
    
    // Find relevant columns based on instruction
    const relevantColumns = findRelevantColumnsFromInstruction(data.headers, instruction);
    
    // Extract all text responses
    const allResponses = [];
    relevantColumns.forEach(column => {
        const responses = data.data
            .map(row => row[column])
            .filter(val => val && val.trim());
        allResponses.push(...responses);
    });
    
    if (allResponses.length === 0) {
        return {
            title: title,
            type: "insights",
            content: [{
                title: "No Data Found",
                content: "No relevant responses found for analysis."
            }]
        };
    }
    
    // Advanced analysis for insights
    const insights = generateInsights(allResponses, instruction);
    
    return {
        title: title,
        type: "insights",
        content: insights
    };
}

function generateInsights(responses, instruction) {
    const insights = [];
    
    // 1. Word frequency analysis
    const wordFrequency = analyzeWordFrequency(responses);
    
    // 2. Sentiment distribution
    const sentimentDist = analyzeSentimentDistribution(responses);
    
    // 3. Response length patterns
    const lengthPatterns = analyzeResponseLengths(responses);
    
    // 4. Key themes with context
    const themes = extractDetailedThemes(responses);
    
    // Generate insight summaries
    if (themes.length > 0) {
        insights.push({
            title: "Top Theme",
            content: `${themes[0].title} was mentioned by ${themes[0].percentage}% of respondents (${themes[0].count}/${responses.length})`,
            count: themes[0].count
        });
    }
    
    if (sentimentDist.positive > sentimentDist.negative) {
        insights.push({
            title: "Overall Sentiment",
            content: `${sentimentDist.positive}% positive responses vs ${sentimentDist.negative}% negative, indicating overall satisfaction`,
            count: Math.round(responses.length * sentimentDist.positive / 100)
        });
    } else if (sentimentDist.negative > sentimentDist.positive) {
        insights.push({
            title: "Overall Sentiment",
            content: `${sentimentDist.negative}% negative responses vs ${sentimentDist.positive}% positive, indicating areas needing attention`,
            count: Math.round(responses.length * sentimentDist.negative / 100)
        });
    }
    
    // Add response engagement insight
    if (lengthPatterns.detailed > 50) {
        insights.push({
            title: "Response Engagement",
            content: `${lengthPatterns.detailed}% provided detailed responses (50+ words), showing high engagement`,
            count: Math.round(responses.length * lengthPatterns.detailed / 100)
        });
    }
    
    // Add top keywords insight
    if (wordFrequency.length > 0) {
        const topWords = wordFrequency.slice(0, 3).map(w => w.word).join(', ');
        insights.push({
            title: "Most Mentioned",
            content: `Key topics: ${topWords}`,
            count: wordFrequency[0].count
        });
    }
    
    return insights.slice(0, 6);
}

function analyzeWordFrequency(responses) {
    const wordCount = {};
    
    responses.forEach(response => {
        const words = response.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3 && !isStopWord(word));
        
        words.forEach(word => {
            wordCount[word] = (wordCount[word] || 0) + 1;
        });
    });
    
    return Object.entries(wordCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([word, count]) => ({ word: capitalizeFirst(word), count }));
}

function analyzeSentimentDistribution(responses) {
    const positiveWords = ['good', 'great', 'excellent', 'love', 'like', 'amazing', 'helpful', 'easy', 'clear', 'effective', 'satisfied', 'happy'];
    const negativeWords = ['bad', 'poor', 'terrible', 'hate', 'dislike', 'difficult', 'hard', 'confusing', 'frustrating', 'problem', 'issue'];
    
    let positive = 0, negative = 0, neutral = 0;
    
    responses.forEach(response => {
        const lower = response.toLowerCase();
        const posScore = positiveWords.reduce((score, word) => score + (lower.includes(word) ? 1 : 0), 0);
        const negScore = negativeWords.reduce((score, word) => score + (lower.includes(word) ? 1 : 0), 0);
        
        if (posScore > negScore) positive++;
        else if (negScore > posScore) negative++;
        else neutral++;
    });
    
    const total = responses.length;
    return {
        positive: Math.round((positive / total) * 100),
        negative: Math.round((negative / total) * 100),
        neutral: Math.round((neutral / total) * 100)
    };
}

function analyzeResponseLengths(responses) {
    const lengths = responses.map(r => r.split(/\s+/).length);
    const detailed = lengths.filter(l => l >= 50).length;
    const brief = lengths.filter(l => l < 10).length;
    const medium = lengths.length - detailed - brief;
    
    const total = responses.length;
    return {
        detailed: Math.round((detailed / total) * 100),
        medium: Math.round((medium / total) * 100),
        brief: Math.round((brief / total) * 100)
    };
}

function extractDetailedThemes(responses) {
    const themes = extractThemesFromResponses(responses);
    
    return themes.map(theme => ({
        ...theme,
        percentage: Math.round((theme.count / responses.length) * 100)
    }));
}

function generateCustomPageFromInstruction(title, instruction, data) {
    const content = [];
    const instructionLower = instruction.toLowerCase();
    
    // Look for specific column names in the instruction
    const mentionedColumns = data.headers.filter(header => 
        instructionLower.includes(header.toLowerCase())
    );
    
    if (mentionedColumns.length > 0) {
        mentionedColumns.forEach(column => {
            const responses = data.data
                .map(row => row[column])
                .filter(val => val && val.trim());
            
            if (responses.length > 0) {
                const summary = responses.length === 1 
                    ? responses[0] 
                    : `${responses.length} responses: ${responses[0]}`;
                
                content.push({
                    title: truncateText(column, 40),
                    content: truncateText(summary, 150)
                });
            }
        });
    } else {
        content.push({
            title: "Custom Analysis",
            content: "Configure this page by specifying which CSV columns or keywords to analyze in the instructions."
        });
    }
    
    return {
        title: title,
        type: "custom",
        content: content
    };
}

// Helper functions
function extractKeywordsFromInstruction(instruction) {
    const quoted = instruction.match(/"([^"]+)"/g) || [];
    const quotedWords = quoted.map(q => q.replace(/"/g, ''));
    
    const commonWords = ['show', 'extract', 'find', 'analyze', 'display', 'get', 'include'];
    const words = instruction.toLowerCase().split(/\s+/)
        .filter(word => word.length > 3 && !commonWords.includes(word));
    
    return [...quotedWords, ...words.slice(0, 5)];
}

function findRelevantColumnsFromInstruction(headers, instruction) {
    const instructionLower = instruction.toLowerCase();
    
    // Look for exact column name matches
    const exactMatches = headers.filter(header => 
        instructionLower.includes(header.toLowerCase())
    );
    
    if (exactMatches.length > 0) {
        return exactMatches;
    }
    
    // Look for keyword matches in headers
    const keywords = extractKeywordsFromInstruction(instruction);
    const keywordMatches = headers.filter(header => 
        keywords.some(keyword => 
            header.toLowerCase().includes(keyword.toLowerCase())
        )
    );
    
    if (keywordMatches.length > 0) {
        return keywordMatches;
    }
    
    // Fallback: return text columns
    return headers.filter((header, index) => {
        if (index >= 5) return false;
        const samples = surveyData.data.slice(0, 3).map(row => row[header]).filter(val => val);
        return samples.some(val => val && val.length > 20);
    });
}

function findRatingColumns(headers) {
    return headers.filter(header => {
        const headerLower = header.toLowerCase();
        return headerLower.includes('rating') || 
               headerLower.includes('score') || 
               headerLower.includes('satisfaction') ||
               headerLower.includes('rate');
    });
}

function calculateCompletionRate(data) {
    const totalQuestions = data.headers.length;
    const completedResponses = data.data.filter(row => {
        const filledFields = Object.values(row).filter(val => val && val.trim()).length;
        return filledFields / totalQuestions > 0.7;
    });
    
    return totalQuestions > 0 ? Math.round((completedResponses.length / data.data.length) * 100) : 0;
}

function calculateAverageRating(data, column) {
    const values = data.data
        .map(row => parseFloat(row[column]))
        .filter(val => !isNaN(val));
    
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function extractThemesFromResponses(responses) {
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
    
    const sortedWords = Object.entries(wordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8);
    
    sortedWords.forEach(([word, count]) => {
        if (count > 1) {
            const examples = responses.filter(r => 
                r.toLowerCase().includes(word)
            ).slice(0, 2);
            
            if (examples.length > 0) {
                themes.push({
                    title: capitalizeFirst(word),
                    count: count,
                    examples: examples
                });
            }
        }
    });
    
    return themes;
}

function isStopWord(word) {
    const stopWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'man', 'men'];
    return stopWords.includes(word);
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function truncateText(text, maxLength) {
    if (!text) return '';
    const str = text.toString();
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text.toString();
    return div.innerHTML;
}

function compressData(data) {
    try {
        const optimizedData = optimizeDataForURL(data);
        const jsonString = JSON.stringify(optimizedData);
        
        if (jsonString.length > 2000) {
            const compactData = createCompactVersion(data);
            const compactJson = JSON.stringify(compactData);
            
            if (compactJson.length > 2000) {
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
    return {
        rc: data.responseCount,
        st: truncateText(data.surveyType, 30),
        p: (data.pages || []).slice(0, 4).map(page => ({
            t: truncateText(page.title, 30),
            ty: page.type,
            c: (page.content || []).slice(0, 4).map(item => ({
                t: truncateText(item.title, 25),
                c: truncateText(item.content, 80)
            }))
        }))
    };
}

function saveToLocalStorage(data) {
    const presentationId = 'pres_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    try {
        localStorage.setItem(presentationId, JSON.stringify(data));
        
        return btoa(JSON.stringify({ 
            type: 'localStorage', 
            id: presentationId,
            fallback: createCompactVersion(data)
        }));
    } catch (error) {
        console.error('LocalStorage save failed:', error);
        return btoa(encodeURIComponent(JSON.stringify(createCompactVersion(data))));
    }
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
    document.getElementById('csvFile').value = '';
    document.getElementById('generateBtn').disabled = true;
    document.getElementById('shareSection').style.display = 'none';
    document.getElementById('pageBuilderSection').style.display = 'none';
    
    const pagesContainer = document.getElementById('pagesContainer');
    if (pagesContainer) {
        pagesContainer.innerHTML = '';
    }
    
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.innerHTML = `
        <div class="upload-icon">📊</div>
        <div class="upload-text">Drop your CSV file here</div>
        <div class="upload-subtext">or click to browse</div>
    `;
    
    surveyData = null;
    presentationData = null;
    window.presentationPages = [];
}

// Drag and drop functionality
document.addEventListener('DOMContentLoaded', function() {
    const uploadArea = document.getElementById('uploadArea');
    
    if (uploadArea) {
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
    }
    
    console.log('Admin interface loaded');
});