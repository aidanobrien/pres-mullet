function updatePresentationContent(data) {
    // Clear existing slides and rebuild based on dynamic data
    const slidesContainer = document.getElementById('slidesContainer');
    slidesContainer.innerHTML = '';
    
    // Update total slides count
    window.totalSlides = data.pages.length + 1; // +1 for title slide
    
    // Create title slide
    const titleSlide = createTitleSlide(data);
    slidesContainer.appendChild(titleSlide);
    
    // Create dynamic slides based on analysis
    data.pages.forEach((page, index) => {
        const slide = createDynamicSlide(page, index + 2);
        slidesContainer.appendChild(slide);
    });
    
    // Update slides container width
    slidesContainer.style.width = `${window.totalSlides * 100}%`;
    
    // Update progress indicator
    updateProgressIndicatorDots();
}

function createTitleSlide(data) {
    const slide = document.createElement('div');
    slide.className = 'slide';
    slide.style.width = `${100 / window.totalSlides}%`;
    
    slide.innerHTML = `
        <h1>${data.surveyType} Results</h1>
        <div class="description">
            <p>Analysis of ${data.responseCount} survey responses</p>
            <div class="stat-grid">
                <div class="stat-item">
                    <div class="stat-value">${data.responseCount}</div>
                    <div class="stat-description">Total Responses</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${data.pages.length}</div>
                    <div class="stat-description">Analysis Sections</div>
                </div>
            </div>
        </div>
    `;
    
    return slide;
}

function createDynamicSlide(pageData, slideNumber) {
    const slide = document.createElement('div');
    slide.className = 'slide';
    slide.style.width = `${100 / window.totalSlides}%`;
    
    let slideContent = `<h2>${pageData.title}</h2>`;
    
    switch (pageData.type) {
        case 'overview':
            slideContent += createOverviewContent(pageData.content);
            break;
        case 'ratings':
            slideContent += createRatingsContent(pageData.content);
            break;
        case 'feedback':
        case 'insights':
        case 'general':
            slideContent += createCardsContent(pageData.content, pageData.type);
            break;
        default:
            slideContent += createGenericContent(pageData.content);
    }
    
    slide.innerHTML = slideContent;
    return slide;
}

function createOverviewContent(stats) {
    return `
        <div class="stats-container">
            ${stats.map(stat => `
                <div class="stat-card">
function createOverviewContent(stats) {
    return `
        <div class="stats-container">
            ${stats.map(stat => `
                <div class="stat-card">
                    <div class="stat-number">${stat.value}</div>
                    <div class="stat-label">${stat.title}</div>
                    ${stat.description ? `<div class="stat-description">${stat.description}</div>` : ''}
                </div>
            `).join('')}
        </div>
    `;
}

function createRatingsContent(ratings) {
    if (ratings.length === 0) {
        return '<div class="description"><p>No rating data available</p></div>';
    }
    
    return `
        <div class="cards-grid">
            ${ratings.map(rating => `
                <div class="feedback-card">
                    <div class="card-title">${rating.title}</div>
                    <div class="rating-value">${rating.value}</div>
                    <div class="card-content">${rating.description}</div>
                </div>
            `).join('')}
        </div>
    `;
}

function createCardsContent(items, type) {
    if (!items || items.length === 0) {
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
    if (!content || content.length === 0) {
        return '<div class="description"><p>No content available</p></div>';
    }
    
    return `
        <div class="cards-grid">
            ${content.map(item => `
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
    
    for (let i = 0; i < window.totalSlides; i++) {
        const dot = document.createElement('div');
        dot.className = 'progress-dot';
        if (i === 0) dot.classList.add('active');
        progressIndicator.appendChild(dot);
    }
}

// Update the existing functions to work with dynamic slide count
function changeSlide(direction) {
    const newSlide = currentSlide + direction;
    
    if (newSlide >= 0 && newSlide < window.totalSlides) {
        currentSlide = newSlide;
        updateSlidePosition();
        updateNavigation();
        updateProgressIndicator();
    }
}

function updateSlidePosition() {
    const slidesContainer = document.getElementById('slidesContainer');
    const translateX = -currentSlide * (100 / window.totalSlides);
    slidesContainer.style.transform = `translateX(${translateX}%)`;
}

function updateNavigation() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    prevBtn.disabled = currentSlide === 0;
    nextBtn.disabled = currentSlide === window.totalSlides - 1;
}

function updateProgressIndicator() {
    const dots = document.querySelectorAll('.progress-dot');
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentSlide);
    });
}

// Update keyboard navigation
document.addEventListener('keydown', function(e) {
    if (document.getElementById('presentationContainer').style.display !== 'none') {
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
            currentSlide = window.totalSlides - 1;
            updateSlidePosition();
            updateNavigation();
            updateProgressIndicator();
        }
    }
});

// Initialize with default total slides
window.totalSlides = 6;let currentSlide = 0;
const totalSlides = 6;
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
    
    prevBtn.disabled = currentSlide === 0;
    nextBtn.disabled = currentSlide === totalSlides - 1;
}

function updateProgressIndicator() {
    const dots = document.querySelectorAll('.progress-dot');
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentSlide);
    });
}

function updatePresentationContent(data) {
    // Update response count and stats
    document.getElementById('responseCount').textContent = data.responseCount;
    document.getElementById('collaborationScore').textContent = data.collaborationScore;
    
    // Update survey purpose if provided
    if (data.purpose) {
        document.getElementById('surveyPurpose').textContent = data.purpose;
    }
    
    // Update cards
    updateCardGrid('positivesGrid', data.positives, 'feedback-card');
    updateCardGrid('improvementsGrid', data.improvements, 'feedback-card improvement');
    updateCardGrid('immediateGrid', data.immediate, 'feedback-card immediate');
    updateCardGrid('longtermGrid', data.longterm, 'feedback-card longterm');
}

function updateCardGrid(gridId, items, cardClass) {
    const grid = document.getElementById(gridId);
    grid.innerHTML = '';
    
    if (!items || items.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: #718096; font-style: italic;">No data available</p>';
        return;
    }
    
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = cardClass;
        card.innerHTML = `
            <div class="card-title">${escapeHtml(item.title || 'Untitled')}</div>
            <div class="card-content">${escapeHtml(item.content || 'No content available')}</div>
        `;
        grid.appendChild(card);
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function decompressData(compressedData) {
    try {
        const decodedString = decodeURIComponent(atob(compressedData));
        return JSON.parse(decodedString);
    } catch (error) {
        console.error('Error decompressing data:', error);
        throw new Error('Invalid presentation data');
    }
}

function showError(message) {
    document.getElementById('loadingContainer').style.display = 'none';
    document.getElementById('errorContainer').style.display = 'flex';
    
    const errorContent = document.querySelector('.error-content p');
    if (message) {
        errorContent.textContent = message;
    }
}

function showPresentation() {
    document.getElementById('loadingContainer').style.display = 'none';
    document.getElementById('errorContainer').style.display = 'none';
    document.getElementById('presentationContainer').style.display = 'block';
    
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
    if (document.getElementById('presentationContainer').style.display !== 'none') {
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