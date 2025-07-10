let currentSlide = 0;
let totalSlides = 6; // Default value, will be updated dynamically
let presentationData = null;

// Presentation navigation functions
function changeSlide(direction) {
    const newSlide = currentSlide + direction;
    
    if (newSlide >= 0 && newSlide < totalSlides) {
        currentSlide = newSlide;
        updateSlidePosition();
        updateNavigation();
        updateProgressIndicator();
    }
}

function updateSlidePosition() {
    const slidesContainer = document.getElementById('slidesContainer');
    const translateX = -currentSlide * (100 / totalSlides);
    slidesContainer.style.transform = `translateX(${translateX}%)`;
}

function updateNavigation() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (prevBtn) prevBtn.disabled = currentSlide === 0;
    if (nextBtn) nextBtn.disabled = currentSlide === totalSlides - 1;
}

function updateProgressIndicator() {
    const dots = document.querySelectorAll('.progress-dot');
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentSlide);
    });
}

function updatePresentationContent(data) {
    try {
        // Clear existing slides and rebuild based on dynamic data
        const slidesContainer = document.getElementById('slidesContainer');
        if (!slidesContainer) {
            console.error('Slides container not found');
            return;
        }
        
        slidesContainer.innerHTML = '';
        
        // Update total slides count
        totalSlides = (data.pages ? data.pages.length : 0) + 1; // +1 for title slide
        
        // Create title slide
        const titleSlide = createTitleSlide(data);
        slidesContainer.appendChild(titleSlide);
        
        // Create dynamic slides based on analysis
        if (data.pages && Array.isArray(data.pages)) {
            data.pages.forEach((page, index) => {
                const slide = createDynamicSlide(page, index + 2);
                slidesContainer.appendChild(slide);
            });
        }
        
        // Update slides container width
        slidesContainer.style.width = `${totalSlides * 100}%`;
        
        // Update progress indicator
        updateProgressIndicatorDots();
        
    } catch (error) {
        console.error('Error updating presentation content:', error);
        showError('Error loading presentation content');
    }
}

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

function updateProgressIndicatorDots() {
    const progressIndicator = document.getElementById('progressIndicator');
    if (!progressIndicator) return;
    
    progressIndicator.innerHTML = '';
    
    for (let i = 0; i < totalSlides; i++) {
        const dot = document.createElement('div');
        dot.className = 'progress-dot';
        if (i === 0) dot.classList.add('active');
        progressIndicator.appendChild(dot);
    }
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = text.toString();
    return div.innerHTML;
}

function decompressData(compressedData) {
    try {
        const decodedString = decodeURIComponent(atob(compressedData));
        const parsed = JSON.parse(decodedString);
        
        // Check if this is a localStorage reference
        if (parsed.type === 'localStorage' && parsed.id) {
            return loadFromLocalStorage(parsed.id, parsed.fallback);
        }
        
        // Check if this is compact format and expand it
        if (parsed.rc !== undefined) { // Compact format detection
            return expandCompactData(parsed);
        }
        
        return parsed;
    } catch (error) {
        console.error('Error decompressing data:', error);
        throw new Error('Invalid presentation data');
    }
}

function loadFromLocalStorage(presentationId, fallback) {
    try {
        const stored = localStorage.getItem(presentationId);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error('Failed to load from localStorage:', error);
    }
    
    // Use fallback if localStorage fails
    if (fallback) {
        return expandCompactData(fallback);
    }
    
    throw new Error('Presentation data not found');
}

function expandCompactData(compactData) {
    // Expand the compact format back to full format
    return {
        responseCount: compactData.rc || 0,
        surveyType: compactData.st || 'Survey',
        pages: (compactData.p || []).map(page => ({
            title: page.t || 'Analysis',
            type: page.ty || 'general',
            content: (page.c || []).map(item => ({
                title: item.t || 'Item',
                content: item.c || 'No content available'
            }))
        }))
    };
}

function showError(message) {
    const loadingContainer = document.getElementById('loadingContainer');
    const errorContainer = document.getElementById('errorContainer');
    const presentationContainer = document.getElementById('presentationContainer');
    
    if (loadingContainer) loadingContainer.style.display = 'none';
    if (errorContainer) errorContainer.style.display = 'flex';
    if (presentationContainer) presentationContainer.style.display = 'none';
    
    const errorContent = document.querySelector('.error-content p');
    if (errorContent && message) {
        errorContent.textContent = message;
    }
}

function showPresentation() {
    const loadingContainer = document.getElementById('loadingContainer');
    const errorContainer = document.getElementById('errorContainer');
    const presentationContainer = document.getElementById('presentationContainer');
    
    if (loadingContainer) loadingContainer.style.display = 'none';
    if (errorContainer) errorContainer.style.display = 'none';
    if (presentationContainer) presentationContainer.style.display = 'block';
    
    // Reset slide position
    currentSlide = 0;
    updateSlidePosition();
    updateNavigation();
    updateProgressIndicator();
}

function loadPresentationFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const compressedData = urlParams.get('d');
    
    if (!compressedData) {
        setTimeout(() => {
            showError('No presentation data found in the URL.');
        }, 1000);
        return;
    }
    
    try {
        presentationData = decompressData(compressedData);
        updatePresentationContent(presentationData);
        
        setTimeout(() => {
            showPresentation();
        }, 1500);
        
    } catch (error) {
        setTimeout(() => {
            showError('The presentation link appears to be corrupted or invalid.');
        }, 1000);
    }
}

// Keyboard navigation for presentation
document.addEventListener('keydown', function(e) {
    const presentationContainer = document.getElementById('presentationContainer');
    if (presentationContainer && presentationContainer.style.display !== 'none') {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            changeSlide(-1);
        }
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
            e.preventDefault();
            changeSlide(1);
        }
        if (e.key === 'Home') {
            e.preventDefault();
            currentSlide = 0;
            updateSlidePosition();
            updateNavigation();
            updateProgressIndicator();
        }
        if (e.key === 'End') {
            e.preventDefault();
            currentSlide = totalSlides - 1;
            updateSlidePosition();
            updateNavigation();
            updateProgressIndicator();
        }
    }
});

// Touch/swipe support for mobile
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', function(e) {
    touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', function(e) {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;
    
    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            // Swipe left - next slide
            changeSlide(1);
        } else {
            // Swipe right - previous slide
            changeSlide(-1);
        }
    }
}

// Prevent context menu on long press for mobile
document.addEventListener('contextmenu', function(e) {
    if (e.target.closest('.presentation-container')) {
        e.preventDefault();
    }
});

// Auto-focus for accessibility
document.addEventListener('DOMContentLoaded', function() {
    // Focus the presentation container for keyboard navigation
    setTimeout(() => {
        const presentationContainer = document.getElementById('presentationContainer');
        if (presentationContainer && presentationContainer.style.display !== 'none') {
            presentationContainer.focus();
        }
    }, 2000);
});

// Initialize on page load
window.addEventListener('load', function() {
    loadPresentationFromURL();
});

// Handle browser back/forward buttons
window.addEventListener('popstate', function() {
    loadPresentationFromURL();
});