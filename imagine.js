// Store generated images in localStorage
function saveImageGeneration(prompt, imageUrl) {
    const history = JSON.parse(localStorage.getItem('stormyImageHistory') || '[]');
    history.unshift({
        prompt,
        imageUrl,
        timestamp: new Date().toISOString()
    });
    
    // Keep only the last 50 generations
    if (history.length > 50) {
        history.pop();
    }
    
    localStorage.setItem('stormyImageHistory', JSON.stringify(history));
}

// Load saved image generations
function loadImageHistory() {
    return JSON.parse(localStorage.getItem('stormyImageHistory') || '[]');
}

// Format timestamp
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Add these new functions at the top
const EFFECTS = {
    SPARKLE: 'sparkle',
    GLOW: 'glow',
    SHIMMER: 'shimmer'
};

// Create sparkle effect for images
function createSparkle(element) {
    const sparkle = document.createElement('div');
    sparkle.className = 'sparkle';
    sparkle.style.cssText = `
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        animation-delay: ${Math.random() * 2}s;
    `;
    element.appendChild(sparkle);
    setTimeout(() => sparkle.remove(), 1000);
}

// Add shimmer effect to element
function addShimmerEffect(element) {
    element.classList.add('shimmer-effect');
    return () => element.classList.remove('shimmer-effect');
}

// Add magical hover effect
function addMagicalHoverEffect(element) {
    element.addEventListener('mousemove', (e) => {
        const { left, top, width, height } = element.getBoundingClientRect();
        const x = (e.clientX - left) / width;
        const y = (e.clientY - top) / height;
        
        element.style.setProperty('--mouse-x', x.toFixed(2));
        element.style.setProperty('--mouse-y', y.toFixed(2));
    });
}

// Update createImageCard function with new effects
function createImageCard(imageData) {
    const card = document.createElement('div');
    card.className = 'image-card';
    
    // Add magical hover effect
    addMagicalHoverEffect(card);
    
    card.innerHTML = `
        <div class="image-wrapper">
            <img src="${imageData.imageUrl}" alt="${imageData.prompt}" loading="lazy">
            <div class="image-overlay">
                <div class="overlay-content">
                    <div class="effect-buttons">
                        <button class="effect-btn sparkle-btn" title="Add sparkles">✨</button>
                        <button class="effect-btn glow-btn" title="Toggle glow">🌟</button>
                        <button class="effect-btn shimmer-btn" title="Add shimmer">💫</button>
                    </div>
                </div>
            </div>
        </div>
        <div class="card-content">
            <div class="prompt">${imageData.prompt}</div>
            <div class="timestamp">${formatTimestamp(imageData.timestamp)}</div>
            <div class="card-actions">
                <button class="action-button download-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                    </svg>
                    Download
                </button>
                <button class="action-button share-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>
                    </svg>
                    Share
                </button>
                <button class="action-button fullscreen-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                    </svg>
                </button>
            </div>
        </div>
    `;

    // Add effect button handlers
    const imgElement = card.querySelector('img');
    
    card.querySelector('.sparkle-btn').addEventListener('click', () => {
        for (let i = 0; i < 10; i++) {
            setTimeout(() => createSparkle(card.querySelector('.image-wrapper')), i * 100);
        }
    });

    card.querySelector('.glow-btn').addEventListener('click', () => {
        imgElement.classList.toggle('glow-effect');
    });

    card.querySelector('.shimmer-btn').addEventListener('click', () => {
        const removeShimmer = addShimmerEffect(imgElement);
        setTimeout(removeShimmer, 2000);
    });

    // Add fullscreen functionality
    card.querySelector('.fullscreen-btn').addEventListener('click', () => {
        openImageModal(imageData);
    });

    // Add existing download and share functionality
    card.querySelector('.download-btn').addEventListener('click', () => {
        downloadImage(imageData.imageUrl, `stormy-imagination-${Date.now()}.png`);
    });

    card.querySelector('.share-btn').addEventListener('click', () => {
        shareImage(imageData);
    });

    // Add lazy loading animation
    imgElement.addEventListener('load', () => {
        imgElement.classList.add('loaded');
    });

    return card;
}

// Download image
async function downloadImage(url, filename) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);
    } catch (error) {
        console.error('Download failed:', error);
        alert('Failed to download image. Please try again.');
    }
}

// Share image
async function shareImage(imageData) {
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Stormy\'s Imagination',
                text: `Check out what Stormy imagined for "${imageData.prompt}"`,
                url: imageData.imageUrl
            });
        } catch (error) {
            console.error('Share failed:', error);
        }
    } else {
        // Fallback to copying URL
        navigator.clipboard.writeText(imageData.imageUrl)
            .then(() => alert('Image URL copied to clipboard!'))
            .catch(() => alert('Failed to copy URL. Please try again.'));
    }
}

// Generate new image
async function generateImage(prompt) {
    const loadingContainer = document.getElementById('loadingContainer');
    const imageGrid = document.getElementById('imageGrid');
    
    loadingContainer.style.display = 'flex';
    imageGrid.style.display = 'none';

    try {
        // Initial request to start the image generation
        const response = await fetch(`https://api.paxsenix.biz.id/ai-image/fluxPro?text=${encodeURIComponent(prompt)}`, {
            headers: {
                'accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to start image generation');
        }

        const initData = await response.json();
        
        if (!initData.ok || !initData.jobId) {
            throw new Error(initData.message || 'Failed to get job ID');
        }

        // Poll for task completion
        const result = await pollTaskStatus(initData.jobId);
        
        // Check for the direct URL in the response
        if (result.ok && result.url) {
            // Save the generation with the direct URL
            saveImageGeneration(prompt, result.url);
            displayImages();
        } else if (result.ok && result.result?.url) {
            // Alternative response structure
            saveImageGeneration(prompt, result.result.url);
            displayImages();
        } else {
            throw new Error('No image URL in the response');
        }
    } catch (error) {
        console.error('Image generation failed:', error);
        alert('Failed to generate image. Please try again.');
    } finally {
        loadingContainer.style.display = 'none';
        imageGrid.style.display = 'grid';
    }
}

// Update polling function
async function pollTaskStatus(jobId, maxAttempts = 30) {
    const loadingTexts = [
        "Gathering magical energy...",
        "Mixing colors of imagination...",
        "Weaving dreams into reality...",
        "Sprinkling stardust...",
        "Channeling creative forces...",
        "Adding a touch of wonder...",
        "Brewing visual magic...",
        "Crafting your vision...",
        "Almost there..."
    ];
    let currentTextIndex = 0;
    const loadingText = document.querySelector('.loading-text');

    // Update loading message periodically
    const messageInterval = setInterval(() => {
        loadingText.textContent = loadingTexts[currentTextIndex];
        currentTextIndex = (currentTextIndex + 1) % loadingTexts.length;
    }, 3000);

    try {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const response = await fetch(`https://api.paxsenix.biz.id/task/${jobId}`, {
                headers: {
                    'accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Task status check:', data);

            if (data.status === 'done' && data.ok) {
                clearInterval(messageInterval);
                return data;
            } else if (data.status === 'pending' || data.status === 'processing') {
                // Wait before next attempt
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                clearInterval(messageInterval);
                throw new Error(data.message || 'Task failed');
            }
        }
        clearInterval(messageInterval);
        throw new Error('Timeout: Image generation took too long');
    } catch (error) {
        clearInterval(messageInterval);
        throw error;
    }
}

// Display all images
function displayImages() {
    const imageGrid = document.getElementById('imageGrid');
    const history = loadImageHistory();
    
    imageGrid.innerHTML = '';
    
    history.forEach(imageData => {
        const card = createImageCard(imageData);
        imageGrid.appendChild(card);
    });
}

// Add modal functionality for fullscreen view
function openImageModal(imageData) {
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <img src="${imageData.imageUrl}" alt="${imageData.prompt}">
            <div class="modal-caption">${imageData.prompt}</div>
            <button class="modal-close">×</button>
        </div>
    `;

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modal);
        }
    });

    modal.querySelector('.modal-close').addEventListener('click', () => {
        closeModal(modal);
    });

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('visible'), 10);

    // Add keyboard support
    const handleKeyboard = (e) => {
        if (e.key === 'Escape') {
            closeModal(modal);
        }
    };
    document.addEventListener('keydown', handleKeyboard);
    modal.addEventListener('remove', () => {
        document.removeEventListener('keydown', handleKeyboard);
    });
}

function closeModal(modal) {
    modal.classList.remove('visible');
    setTimeout(() => modal.remove(), 300);
}

// Add these styles to the document
const magicalStyles = document.createElement('style');
magicalStyles.textContent = `
    .image-wrapper {
        position: relative;
        overflow: hidden;
        border-radius: 10px;
    }

    .image-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.4);
        opacity: 0;
        transition: opacity 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .image-card:hover .image-overlay {
        opacity: 1;
    }

    .effect-buttons {
        display: flex;
        gap: 1rem;
    }

    .effect-btn {
        background: rgba(147, 51, 234, 0.8);
        border: none;
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.3s ease;
        backdrop-filter: blur(4px);
    }

    .effect-btn:hover {
        transform: scale(1.1);
        background: rgba(147, 51, 234, 1);
    }

    .sparkle {
        position: absolute;
        width: 20px;
        height: 20px;
        background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23fff"><path d="M12 0l2.5 9.5L24 12l-9.5 2.5L12 24l-2.5-9.5L0 12l9.5-2.5z"/></svg>');
        animation: sparkle-animation 1s linear forwards;
        pointer-events: none;
    }

    .glow-effect {
        animation: glow 2s ease-in-out infinite;
    }

    .shimmer-effect {
        position: relative;
        overflow: hidden;
    }

    .shimmer-effect::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 200%;
        height: 100%;
        background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.3),
            transparent
        );
        animation: shimmer 2s linear;
    }

    .image-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.3s ease;
    }

    .image-modal.visible {
        opacity: 1;
    }

    .modal-content {
        position: relative;
        max-width: 90vw;
        max-height: 90vh;
    }

    .modal-content img {
        max-width: 100%;
        max-height: 90vh;
        border-radius: 10px;
        box-shadow: 0 0 30px rgba(147, 51, 234, 0.3);
    }

    .modal-caption {
        position: absolute;
        bottom: -40px;
        left: 0;
        right: 0;
        text-align: center;
        color: white;
        font-size: 1.1rem;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
    }

    .modal-close {
        position: absolute;
        top: -40px;
        right: -40px;
        background: none;
        border: none;
        color: white;
        font-size: 2rem;
        cursor: pointer;
        padding: 10px;
        line-height: 1;
    }

    @keyframes sparkle-animation {
        0% {
            transform: scale(0) rotate(0deg);
            opacity: 0;
        }
        50% {
            transform: scale(1) rotate(180deg);
            opacity: 1;
        }
        100% {
            transform: scale(0) rotate(360deg);
            opacity: 0;
        }
    }

    @keyframes glow {
        0%, 100% {
            filter: brightness(1) drop-shadow(0 0 10px rgba(147, 51, 234, 0.3));
        }
        50% {
            filter: brightness(1.2) drop-shadow(0 0 20px rgba(147, 51, 234, 0.5));
        }
    }

    @keyframes shimmer {
        0% {
            transform: translateX(-100%);
        }
        100% {
            transform: translateX(0);
        }
    }

    .image-card img {
        opacity: 0;
        transition: opacity 0.5s ease;
    }

    .image-card img.loaded {
        opacity: 1;
    }
`;

document.head.appendChild(magicalStyles);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const prompt = urlParams.get('prompt');
    
    if (prompt) {
        generateImage(prompt);
    } else {
        // Just display existing images
        document.getElementById('loadingContainer').style.display = 'none';
        displayImages();
    }
}); 