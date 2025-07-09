let currentSlide = 0;
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