function createTitleSlide(data) {
    const slide = document.createElement('div');
    slide.className = 'slide cover-slide';
    slide.style.width = `${100 / totalSlides}%`;
    
    const surveyType = data.surveyType || 'Survey Results';
    
    slide.innerHTML = `
        <div class="cover-content">
            <h1 class="cover-title">${escapeHtml(surveyType)}</h1>
        </div>
    `;
    
    return slide;
}

function createDynamicSlide(pageData, slideNumber) {
    const slide = document.createElement('div');
    slide.className = 'slide';
    slide.style.width = `${100 / totalSlides}%`;
    
    let slideContent = `<h2>${escapeHtml(pageData.title || 'Analysis')}</h2>`;
    
    try {
        switch (pageData.type) {
            case 'overview':
                slideContent += createOverviewContent(pageData.content || []);
                break;
            case 'ratings':
                slideContent += createRatingsContent(pageData.content || []);
                break;
            case 'feedback':
            case 'insights':
            case 'general':
                slideContent += createCardsContent(pageData.content || [], pageData.type);
                break;
            case 'thankyou':
                // Create thank you slide - same style as cover
                slide.className = 'slide cover-slide';
                slideContent = `
                    <div class="cover-content">
                        <h1 class="cover-title">Thank You</h1>
                    </div>
                `;
                break;
            default:
                slideContent += createGenericContent(pageData.content || []);
        }
    } catch (error) {
        console.error('Error creating slide content:', error);
        slideContent += '<div class="description"><p>Error loading content for this section</p></div>';
    }
    
    slide.innerHTML = slideContent;
    return slide;
}

function createOverviewContent(stats) {
    if (!Array.isArray(stats) || stats.length === 0) {
        return '<div class="description"><p>No overview data available</p></div>';
    }
    
    // Filter out "Analysis Sections" or similar metrics
    const filteredStats = stats.filter(stat => 
        !stat.title.toLowerCase().includes('analysis') &&
        !stat.title.toLowerCase().includes('section')
    );
    
    if (filteredStats.length === 0) {
        return '<div class="description"><p>No overview data available</p></div>';
    }
    
    return `
        <div class="stats-container">
            ${filteredStats.map(stat => `
                <div class="stat-card">
                    <div class="stat-number">${escapeHtml(stat.value || 'N/A')}</div>
                    <div class="stat-label">${escapeHtml(stat.title || 'Statistic')}</div>
                    ${stat.description ? `<div class="stat-description">${escapeHtml(stat.description)}</div>` : ''}
                </div>
            `).join('')}
        </div>
    `;
}

function createRatingsContent(ratings) {
    if (!Array.isArray(ratings) || ratings.length === 0) {
        return '<div class="description"><p>No rating data available</p></div>';
    }
    
    return `
        <div class="cards-grid">
            ${ratings.map(rating => `
                <div class="feedback-card">
                    <div class="card-title">${escapeHtml(rating.title || 'Rating')}</div>
                    <div class="rating-value">${escapeHtml(rating.value || 'N/A')}</div>
                    <div class="card-content">${escapeHtml(rating.description || '')}</div>
                </div>
            `).join('')}
        </div>
    `;
}

function createCardsContent(items, type) {
    if (!Array.isArray(items) || items.length === 0) {
        return '<div class="description"><p>No data available for this section</p></div>';
    }
    
    const cardClass = getCardClassForType(type);
    
    return `
        <div class="cards-grid">
            ${items.map(item => `
                <div class="feedback-card ${cardClass}">
                    <div class="card-title">${escapeHtml(item.title || 'Response')}</div>
                    <div class="card-content">${escapeHtml(item.content || 'No content available')}</div>
                    ${item.count ? `<div class="card-meta">${item.count} mentions</div>` : ''}
                </div>
            `).join('')}
        </div>
    `;
}

function createGenericContent(content) {
    if (!content || (!Array.isArray(content) && typeof content !== 'object')) {
        return '<div class="description"><p>No content available</p></div>';
    }
    
    const items = Array.isArray(content) ? content : [content];
    
    return `
        <div class="cards-grid">
            ${items.map(item => `
                <div class="feedback-card">
                    <div class="card-title">${escapeHtml(item.title || 'Item')}</div>
                    <div class="card-content">${escapeHtml(item.content || item.toString())}</div>
                </div>
            `).join('')}
        </div>
    `;
}

function getCardClassForType(type) {
    const typeClasses = {
        'feedback': '',
        'insights': 'immediate',
        'general': 'longterm',
        'positive': '',
        'improvement': 'improvement',
        'suggestions': 'immediate'
    };
    
    return typeClasses[type] || '';
}