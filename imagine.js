// Store generated images in localStorage
function saveImageGeneration(prompt, imageUrl, modelName, modelIcon) {
    try {
        const history = JSON.parse(localStorage.getItem('stormyImageHistory') || '[]');
        const newImage = {
            prompt,
            imageUrl,
            modelName,
            modelIcon,
            timestamp: new Date().toISOString()
        };
        
        console.log('Saving new image:', newImage); // Debug log
        
        history.unshift(newImage);
        
        // Keep only the last 50 generations
        if (history.length > 50) {
            history.pop();
        }
        
        localStorage.setItem('stormyImageHistory', JSON.stringify(history));
        console.log('Updated history:', history); // Debug log
    } catch (error) {
        console.error('Error saving image:', error);
        showToast('Failed to save image to history 😔');
    }
}

// Load saved image generations
function loadImageHistory() {
    const history = JSON.parse(localStorage.getItem('stormyImageHistory') || '[]');
    console.log('Loaded image history:', history); // Debug log
    return history;
}

// Format timestamp
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Add slider configuration
const SLIDER_CONFIG = {
    currentIndex: 0,
    autoplayInterval: null,
    autoplayDelay: 5000 // 5 seconds per image
};

// Update AI_MODELS to include NSFW model with proper endpoint
const AI_MODELS = {
    FLUX_PRO: {
        name: 'Flux Pro',
        endpoint: 'fluxPro',
        icon: '🎨'
    },
    DALLE: {
        name: 'DALL-E',
        endpoint: 'dalle',
        icon: '🖼️'
    },
    ANIMAGINE: {
        name: 'Animagine',
        endpoint: 'animagine',
        icon: '🌟'
    },
    SDXL_BETA: {
        name: 'SDXL Beta',
        endpoint: 'sdxlBeta',
        icon: '✨'
    },
    SDXL: {
        name: 'SDXL',
        endpoint: 'sdxl',
        icon: '💫'
    },
    NSFW: {
        name: 'NSFW',
        endpoint: 'nsfw',
        icon: '🔞',
        isNSFW: true
    }
};

// Update generateImage function to strictly separate NSFW mode
async function generateImage(prompt) {
    const loadingContainer = document.getElementById('loadingContainer');
    const imageGrid = document.getElementById('imageGrid');
    const loadingText = document.querySelector('.loading-text');
    const generateBtn = document.getElementById('generateBtn');
    const promptInput = document.getElementById('promptInput');
    
    // Disable inputs while generating
    if (generateBtn) generateBtn.disabled = true;
    if (promptInput) promptInput.disabled = true;
    
    loadingContainer.style.display = 'flex';
    imageGrid.style.display = 'grid';

    // Check NSFW mode
    const nsfwEnabled = document.querySelector('.nsfw-toggle.active');
    
    let bundle = {
        type: 'bundle',
        images: [],
        timestamp: new Date().toISOString()
    };

    // Create bundle card with a unique ID
    const bundleCardId = `bundle-${Date.now()}`;
    const bundleCard = createBundleCard(bundle);
    bundleCard.id = bundleCardId;
    
    if (imageGrid.firstChild) {
        imageGrid.insertBefore(bundleCard, imageGrid.firstChild);
    } else {
        imageGrid.appendChild(bundleCard);
    }

    try {
        if (nsfwEnabled) {
            let retryCount = 0;
            let success = false;

            while (!success && retryCount < 3) {
                try {
                    loadingText.textContent = `Creating with ${AI_MODELS.NSFW.icon} ${AI_MODELS.NSFW.name}... (Attempt ${retryCount + 1})`;
                    
                    const response = await fetch(
                        `https://api.paxsenix.biz.id/ai-image/nsfw?text=${encodeURIComponent(prompt)}`,
                        {
                            headers: {
                                'accept': 'application/json'
                            }
                        }
                    );

                    if (!response.ok) {
                        throw new Error('Failed to start NSFW generation');
                    }

                    const initData = await response.json();
                    if (!initData.ok || !initData.jobId) {
                        throw new Error('Failed to get NSFW job ID');
                    }

                    const result = await pollTaskStatus(initData.jobId);
                    if (result.ok && (result.url || result.result?.url)) {
                        success = true;
                        const imageUrl = result.url || result.result.url;
                        bundle.images.push({
                            prompt,
                            imageUrl,
                            modelName: AI_MODELS.NSFW.name,
                            modelIcon: AI_MODELS.NSFW.icon,
                            isNSFW: true,
                            timestamp: new Date().toISOString()
                        });
                        showToast(`${AI_MODELS.NSFW.icon} NSFW image generated!`);
                    }
                } catch (error) {
                    console.error(`NSFW generation attempt ${retryCount + 1} failed:`, error);
                    retryCount++;
                    if (retryCount < 3) {
                        showToast(`Retrying NSFW generation... (Attempt ${retryCount + 1})`);
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    }
                }
            }

            if (!success) {
                throw new Error('All NSFW generation attempts failed');
            }
        } else {
            // Normal mode: generate with all non-NSFW models
            const models = Object.values(AI_MODELS).filter(model => !model.isNSFW);
            for (const model of models) {
                let retryCount = 0;
                let success = false;

                while (!success && retryCount < 3) {
                    try {
                        loadingText.textContent = `Creating with ${model.icon} ${model.name}... (Attempt ${retryCount + 1})`;
                        
                        const response = await fetch(
                            `https://api.paxsenix.biz.id/ai-image/${model.endpoint}?text=${encodeURIComponent(prompt)}`,
                            {
                                headers: {
                                    'accept': 'application/json'
                                }
                            }
                        );

                        if (!response.ok) continue;

                        const initData = await response.json();
                        if (!initData.ok || !initData.jobId) continue;

                        const result = await pollTaskStatus(initData.jobId);
                        if (result.ok && (result.url || result.result?.url)) {
                            const imageUrl = result.url || result.result.url;
                            bundle.images.push({
                                prompt,
                                imageUrl,
                                modelName: model.name,
                                modelIcon: model.icon,
                                timestamp: new Date().toISOString()
                            });

                            // Update bundle card after each successful generation
                            const existingCard = document.getElementById(bundleCardId);
                            if (existingCard) {
                                const newBundleCard = createBundleCard(bundle);
                                newBundleCard.id = bundleCardId;
                                existingCard.replaceWith(newBundleCard);
                            }

                            showToast(`${model.icon} ${model.name} image generated!`);
                            success = true;
                        }
                    } catch (error) {
                        console.error(`Generation attempt ${retryCount + 1} failed for ${model.name}:`, error);
                        retryCount++;
                        if (retryCount < 3) {
                            showToast(`Retrying with ${model.name}... (Attempt ${retryCount + 1})`);
                            await new Promise(resolve => setTimeout(resolve, 3000));
                        }
                    }
                }
            }
        }

        // Save and update UI
        if (bundle.images.length > 0) {
            const history = JSON.parse(localStorage.getItem('stormyImageHistory') || '[]');
            history.unshift(bundle);
            if (history.length > 50) history.pop();
            localStorage.setItem('stormyImageHistory', JSON.stringify(history));
            
            showToast(`Generated ${bundle.images.length} image${bundle.images.length > 1 ? 's' : ''} successfully! ✨`);
        } else {
            throw new Error('No images were generated successfully');
        }
    } catch (error) {
        console.error('Image generation failed:', error);
        showToast('Failed to generate images 😔');
        
        const emptyCard = document.getElementById(bundleCardId);
        if (emptyCard) emptyCard.remove();
    } finally {
        // Re-enable inputs
        if (generateBtn) generateBtn.disabled = false;
        if (promptInput) promptInput.disabled = false;
        loadingContainer.style.display = 'none';
    }
}

// Add function to save image bundles
function saveImageBundle(images) {
    try {
        const history = JSON.parse(localStorage.getItem('stormyImageHistory') || '[]');
        const bundle = {
            type: 'bundle',
            images,
            timestamp: new Date().toISOString()
        };
        
        history.unshift(bundle);
        if (history.length > 50) history.pop();
        localStorage.setItem('stormyImageHistory', JSON.stringify(history));
    } catch (error) {
        console.error('Error saving bundle:', error);
        showToast('Failed to save images to history 😔');
    }
}

// Update createImageCard to handle bundles
function createImageCard(imageData) {
    if (imageData.type === 'bundle') {
        return createBundleCard(imageData);
    }
    const card = document.createElement('div');
    card.className = 'image-card';
    
    card.innerHTML = `
        <div class="image-wrapper">
            <div class="loading-spinner"></div>
            <img 
                src="${imageData.imageUrl}" 
                alt="${imageData.prompt}" 
                loading="lazy"
                style="opacity: 0; transition: opacity 0.3s ease;"
            >
            <div class="image-overlay">
                <div class="overlay-actions">
                    <button class="overlay-btn download-btn" title="Download Image">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                        </svg>
                    </button>
                    <button class="overlay-btn share-btn" title="Share Image">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="18" cy="5" r="3"/>
                            <circle cx="6" cy="12" r="3"/>
                            <circle cx="18" cy="19" r="3"/>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                        </svg>
                    </button>
                    <button class="overlay-btn fullscreen-btn" title="View Fullscreen">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                        </svg>
                    </button>
                    <button class="overlay-btn regenerate-btn" title="Regenerate Image">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                        </svg>
                    </button>
                    <button class="overlay-btn upscale-btn" title="Upscale Image">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M7 17L17 7M7 7h10v10"/>
                        </svg>
                    </button>
                    <button class="overlay-btn delete-btn" title="Delete Image">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
            ${imageData.modelName ? `
                <div class="model-badge ${imageData.isNSFW ? 'nsfw' : ''}">
                    ${imageData.modelIcon} ${imageData.modelName}
                </div>
            ` : ''}
        </div>
        <div class="card-content">
            <div class="prompt-section">
                <p class="prompt">${imageData.prompt}</p>
                <span class="timestamp">${new Date(imageData.timestamp).toLocaleString()}</span>
            </div>
        </div>
    `;

    // Handle image loading
    const img = card.querySelector('img');
    const loadingSpinner = card.querySelector('.loading-spinner');
    
    img.addEventListener('load', () => {
        img.style.opacity = '1';
        loadingSpinner?.remove();
    });

    img.addEventListener('error', () => {
        console.error('Failed to load image:', imageData.imageUrl);
        loadingSpinner?.remove();
        card.classList.add('error');
        card.querySelector('.image-wrapper').innerHTML = `
            <div class="error-message">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12" y2="16"/>
                </svg>
                <p>Failed to load image</p>
            </div>
        `;
    });

    // Update download handler
    card.querySelector('.download-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
            showToast('Starting download...');
            const response = await fetch(imageData.imageUrl);
            if (!response.ok) throw new Error('Failed to fetch image');
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = `stormy-imagination-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(objectUrl);
            
            showToast('Download complete! ✨');
        } catch (error) {
            console.error('Download failed:', error);
            showToast('Failed to download image 😔');
        }
    });

    // Update share handler
    card.querySelector('.share-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (navigator.share) {
            navigator.share({
                title: 'Stormy\'s Imagination',
                text: `Check out what Stormy imagined: ${imageData.prompt}`,
                url: imageData.imageUrl
            }).catch(() => {
                copyToClipboard(imageData.imageUrl);
            });
        } else {
            copyToClipboard(imageData.imageUrl);
        }
    });

    // Add event listeners
    card.querySelector('.fullscreen-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        openImageModal(imageData);
    });

    // Add delete handler
    card.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Delete this image?')) {
            const history = loadImageHistory();
            const updatedHistory = history.filter(item => 
                item.imageUrl !== imageData.imageUrl
            );
            localStorage.setItem('stormyImageHistory', JSON.stringify(updatedHistory));
            card.remove();
            showToast('Image deleted');
        }
    });

    // Add regenerate handler
    card.querySelector('.regenerate-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        const loadingSpinner = card.querySelector('.loading-spinner');
        loadingSpinner.style.display = 'block';
        
        try {
            await generateImage(imageData.prompt);
            showToast('Image regenerated! ✨');
        } catch (error) {
            console.error('Regeneration failed:', error);
            showToast('Failed to regenerate image 😔');
        } finally {
            loadingSpinner.style.display = 'none';
        }
    });

    // Add upscale handler
    card.querySelector('.upscale-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        const loadingSpinner = card.querySelector('.loading-spinner');
        loadingSpinner.style.display = 'block';
        
        try {
            showToast('Starting upscale...');
            const response = await fetch(
                `https://api.paxsenix.biz.id/tools/upscale?url=${encodeURIComponent(imageData.imageUrl)}`,
                {
                    headers: {
                        'accept': 'application/json'
                    }
                }
            );

            if (!response.ok) throw new Error('Failed to start upscale');

            const initData = await response.json();
            if (!initData.ok || !initData.jobId) throw new Error('Failed to get upscale job ID');

            const result = await pollTaskStatus(initData.jobId);
            if (result.ok && (result.url || result.result?.url)) {
                const upscaledUrl = result.url || result.result.url;
                const upscaledData = {
                    ...imageData,
                    imageUrl: upscaledUrl,
                    isUpscaled: true
                };
                const upscaledCard = createImageCard(upscaledData);
                card.parentNode.insertBefore(upscaledCard, card.nextSibling);
                showToast('Image upscaled successfully! ✨');
            }
        } catch (error) {
            console.error('Upscale failed:', error);
            showToast('Failed to upscale image 😔');
        } finally {
            loadingSpinner.style.display = 'none';
        }
    });

    return card;
}

// Update createBundleCard function to fix image loading
function createBundleCard(bundle) {
    const card = document.createElement('div');
    card.className = 'image-card bundle-card';
    
    const images = bundle.images;
    
    if (images.length === 0) {
        card.innerHTML = `
            <div class="image-wrapper slider-wrapper">
                <div class="loading-spinner"></div>
                <p class="loading-text">Generating images...</p>
            </div>
        `;
        return card;
    }

    card.innerHTML = `
        <div class="image-wrapper slider-wrapper">
            <div class="slider-container">
                ${images.map((img, index) => `
                    <div class="slide ${index === 0 ? 'active' : ''}" data-index="${index}">
                        <div class="loading-spinner"></div>
                        <img 
                            src="${img.imageUrl}" 
                            alt="${img.prompt}" 
                            loading="lazy"
                            onload="this.style.opacity='1'; this.previousElementSibling.remove()"
                            style="width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 0.3s ease;"
                        >
                        <div class="model-badge">
                            ${img.modelIcon} ${img.modelName}
                        </div>
                    </div>
                `).join('')}
            </div>
            ${images.length > 1 ? `
                <button class="slider-btn prev">❮</button>
                <button class="slider-btn next">❯</button>
                <div class="slider-dots">
                    ${images.map((_, index) => `
                        <button class="dot ${index === 0 ? 'active' : ''}" data-index="${index}"></button>
                    `).join('')}
                </div>
            ` : ''}
        </div>
        <div class="card-content">
            <div class="prompt-section">
                <p class="prompt">${images[0].prompt}</p>
                <span class="timestamp">${new Date(bundle.timestamp).toLocaleString()}</span>
            </div>
        </div>
    `;

    // Initialize slider if there are multiple images
    if (images.length > 1) {
        initializeSlider(card);
    }

    return card;
}

// Add function to initialize slider
function initializeSlider(card) {
    const slides = card.querySelectorAll('.slide');
    const dots = card.querySelectorAll('.dot');
    const prevBtn = card.querySelector('.slider-btn.prev');
    const nextBtn = card.querySelector('.slider-btn.next');

    let currentIndex = 0;

    function showSlide(index) {
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));
        slides[index].classList.add('active');
        dots[index].classList.add('active');
        currentIndex = index;
    }

    if (prevBtn && nextBtn) {
        prevBtn.addEventListener('click', () => {
            const newIndex = (currentIndex - 1 + slides.length) % slides.length;
            showSlide(newIndex);
        });

        nextBtn.addEventListener('click', () => {
            const newIndex = (currentIndex + 1) % slides.length;
            showSlide(newIndex);
        });
    }

    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            const index = parseInt(dot.dataset.index);
            showSlide(index);
        });
    });

    // Add autoplay
    let autoplayInterval;
    
    function startAutoplay() {
        autoplayInterval = setInterval(() => {
            const newIndex = (currentIndex + 1) % slides.length;
            showSlide(newIndex);
        }, 5000);
    }

    function stopAutoplay() {
        clearInterval(autoplayInterval);
    }

    card.addEventListener('mouseenter', stopAutoplay);
    card.addEventListener('mouseleave', startAutoplay);
    startAutoplay();
}

// Add these utility functions at the top
function showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Show toast
    requestAnimationFrame(() => {
        toast.classList.add('visible');
    });
    
    // Hide and remove toast
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Update the share functionality
async function shareImage(imageData) {
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Stormy\'s Imagination',
                text: `Check out what Stormy imagined for "${imageData.prompt}"`,
                url: imageData.imageUrl
            });
            showToast('Shared successfully! ✨');
        } catch (error) {
            if (error.name !== 'AbortError') {
                showToast('Failed to share. Copying link instead...');
                copyToClipboard(imageData.imageUrl);
            }
        }
    } else {
        copyToClipboard(imageData.imageUrl);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => showToast('Link copied to clipboard! ✨'))
        .catch(() => showToast('Failed to copy link 😔'));
}

// Update the download functionality
async function downloadImage(url, filename) {
    try {
        showToast('Starting download...');
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
        
        showToast('Download complete! ✨');
    } catch (error) {
        console.error('Download failed:', error);
        showToast('Failed to download image 😔');
    }
}

// Update polling function to be more persistent
async function pollTaskStatus(jobId, maxTime = 300000) { // 5 minutes max
    const loadingTexts = [
        'Creating magical moments...',
        'Gathering inspiration...',
        'Painting with pixels...',
        'Adding sparkles...',
        'Almost there...'
    ];
    let currentTextIndex = 0;
    const loadingText = document.querySelector('.loading-text');
    const startTime = Date.now();

    // Update loading message periodically
    const messageInterval = setInterval(() => {
        loadingText.textContent = loadingTexts[currentTextIndex];
        currentTextIndex = (currentTextIndex + 1) % loadingTexts.length;
    }, 3000);

    try {
        while (Date.now() - startTime < maxTime) {
            try {
                const response = await fetch(`https://api.paxsenix.biz.id/task/${jobId}`, {
                    headers: {
                        'accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    console.log(`Polling attempt failed with status ${response.status}, retrying...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    continue;
                }

                const data = await response.json();
                console.log('Task status check:', data);

                if (data.status === 'done' && data.ok) {
                    clearInterval(messageInterval);
                    return data;
                } else if (data.status === 'failed' || data.error) {
                    clearInterval(messageInterval);
                    throw new Error(data.message || 'Task failed');
                }
                
                // If still processing, wait and try again
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                console.log('Polling attempt error:', error);
                // Wait a bit longer on error before retrying
                await new Promise(resolve => setTimeout(resolve, 3000));
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
    if (!imageGrid) {
        console.error('Image grid element not found');
        return;
    }

    const history = loadImageHistory();
    console.log('Displaying images:', history.length); // Debug log
    
    imageGrid.innerHTML = '';
    
    if (history.length === 0) {
        // Show empty state
        imageGrid.innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7m4 13v-4m-4 4h8"/>
                </svg>
                <p>No images yet! Try generating some magical creations.</p>
            </div>
        `;
        return;
    }
    
    history.forEach((imageData, index) => {
        try {
            const card = createImageCard(imageData);
            imageGrid.appendChild(card);
        } catch (error) {
            console.error(`Error creating card for image ${index}:`, error);
        }
    });
}

// Update the modal functionality
function openImageModal(imageData) {
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <img src="${imageData.imageUrl}" alt="${imageData.prompt}">
            <div class="modal-caption">
                <p class="prompt">${imageData.prompt}</p>
                <div class="modal-actions">
                    <button class="action-button download-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                        </svg>
                        Download
                    </button>
                    <button class="action-button share-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="18" cy="5" r="3"/>
                            <circle cx="6" cy="12" r="3"/>
                            <circle cx="18" cy="19" r="3"/>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                        </svg>
                        Share
                    </button>
                </div>
            </div>
            <button class="modal-close">×</button>
        </div>
    `;

    // Add event listeners
    modal.querySelector('.download-btn').addEventListener('click', () => {
        downloadImage(imageData.imageUrl, `stormy-imagination-${Date.now()}.png`);
    });

    modal.querySelector('.share-btn').addEventListener('click', () => {
        shareImage(imageData);
    });

    modal.querySelector('.modal-close').addEventListener('click', () => {
        closeModal(modal);
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modal);
        }
    });

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

    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('visible'));
}

function closeModal(modal) {
    modal.classList.remove('visible');
    setTimeout(() => modal.remove(), 300);
}

// Update NSFW toggle to be more prominent
function addNSFWToggle() {
    const controlsSection = document.querySelector('.controls-section');
    const nsfwToggle = document.createElement('button');
    nsfwToggle.className = 'control-button nsfw-toggle';
    nsfwToggle.innerHTML = `
        <span class="nsfw-icon">🔞</span>
        NSFW Mode: <span class="status">OFF</span>
    `;
    nsfwToggle.title = 'Toggle NSFW Mode (Generates single NSFW image)';
    controlsSection.appendChild(nsfwToggle);

    let nsfwEnabled = false;
    nsfwToggle.addEventListener('click', () => {
        nsfwEnabled = !nsfwEnabled;
        nsfwToggle.querySelector('.status').textContent = nsfwEnabled ? 'ON' : 'OFF';
        nsfwToggle.classList.toggle('active', nsfwEnabled);
        showToast(nsfwEnabled ? '🔞 NSFW Mode enabled - Will generate single NSFW image' : '✨ Normal Mode enabled - Will generate multiple images');
    });
}

// Add delete functionality
function addDeleteButtons() {
    const controlsSection = document.querySelector('.controls-section');
    const deleteAllBtn = document.createElement('button');
    deleteAllBtn.className = 'control-button delete-all-btn';
    deleteAllBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
        </svg>
        Delete All
    `;
    controlsSection.appendChild(deleteAllBtn);

    // Add delete all handler
    deleteAllBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete all images?')) {
            localStorage.removeItem('stormyImageHistory');
            displayImages();
            showToast('All images deleted');
        }
    });
}

// Combine all styles at the top of imagine.js
const styles = `
    :root {
        --primary: #9333ea;
        --primary-light: #a855f7;
        --primary-dark: #7928ca;
        --background: #1a1a2e;
        --surface: #16213e;
        --text: #ffffff;
        --text-secondary: #e9d5ff;
    }

    /* Toast styles */
    .toast {
        position: fixed;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: rgba(147, 51, 234, 0.9);
        color: white;
        padding: 1rem 2rem;
        border-radius: 50px;
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        opacity: 0;
        transition: all 0.3s ease;
        z-index: 1000;
    }

    .toast.visible {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
    }

    /* Loading styles */
    .loading-container {
        min-height: 60vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2rem;
    }

    .loading-text {
        font-size: 1.2rem;
        color: var(--text-secondary);
        text-align: center;
    }

    /* Modal styles */
    .image-modal {
        position: fixed;
        inset: 0;
        background: rgba(26, 26, 46, 0.95);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
    }

    .image-modal.visible {
        opacity: 1;
        visibility: visible;
    }

    .modal-content {
        max-width: 90vw;
        max-height: 90vh;
        position: relative;
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
    }

    /* Error message styles */
    .error-message {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--text-secondary);
        gap: 1rem;
        padding: 2rem;
        text-align: center;
    }

    .error-message svg {
        opacity: 0.5;
    }

    .error-message p {
        font-size: 0.9rem;
        opacity: 0.7;
    }

    .image-card.error .image-wrapper {
        background: rgba(147, 51, 234, 0.05);
        aspect-ratio: 1;
    }

    /* Empty state styles */
    .empty-state {
        text-align: center;
        padding: 4rem 2rem;
        color: var(--text-secondary);
        background: rgba(147, 51, 234, 0.05);
        border-radius: 20px;
        border: 1px dashed rgba(147, 51, 234, 0.2);
        grid-column: 1 / -1;
    }

    .empty-state svg {
        margin-bottom: 1rem;
        stroke: var(--primary);
        opacity: 0.5;
    }

    .empty-state p {
        font-size: 1.1rem;
        line-height: 1.6;
    }

    .model-badge {
        position: absolute;
        top: 1rem;
        left: 1rem;
        background: rgba(147, 51, 234, 0.9);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 20px;
        font-size: 0.8rem;
        backdrop-filter: blur(4px);
        z-index: 10;
        opacity: 0.8;
        transition: opacity 0.3s ease;
    }

    .image-card:hover .model-badge {
        opacity: 1;
    }

    /* Slider styles */
    .bundle-card .slider-wrapper {
        position: relative;
        overflow: hidden;
    }

    .slider-container {
        position: relative;
        width: 100%;
        height: 100%;
    }

    .slide {
        position: absolute;
        inset: 0;
        opacity: 0;
        transition: opacity 0.5s ease;
    }

    .slide.active {
        opacity: 1;
    }

    .slider-btn {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(147, 51, 234, 0.3);
        border: none;
        color: white;
        padding: 1rem;
        cursor: pointer;
        z-index: 10;
        backdrop-filter: blur(4px);
        transition: all 0.3s ease;
    }

    .slider-btn:hover {
        background: rgba(147, 51, 234, 0.6);
    }

    .slider-btn.prev {
        left: 1rem;
    }

    .slider-btn.next {
        right: 1rem;
    }

    .slider-dots {
        position: absolute;
        bottom: 1rem;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 0.5rem;
        z-index: 10;
    }

    .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.5);
        border: none;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .dot.active {
        background: var(--primary);
        transform: scale(1.2);
    }

    .overlay-btn.regenerate-btn:hover {
        animation: spin 1s linear;
    }

    @keyframes spin {
        100% { transform: rotate(360deg); }
    }

    .overlay-btn.upscale-btn:hover {
        transform: scale(1.2);
    }

    .model-badge.nsfw {
        background: rgba(255, 0, 0, 0.3);
        border: 1px solid rgba(255, 0, 0, 0.3);
    }

    .upscaled-badge {
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: rgba(147, 51, 234, 0.9);
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.8rem;
        backdrop-filter: blur(4px);
        z-index: 10;
    }

    .nsfw-toggle {
        background: rgba(255, 0, 0, 0.1);
        border: 1px solid rgba(255, 0, 0, 0.2);
    }

    .nsfw-toggle.active {
        background: rgba(255, 0, 0, 0.3);
    }

    .delete-all-btn {
        background: rgba(255, 0, 0, 0.1);
        border: 1px solid rgba(255, 0, 0, 0.2);
    }

    .delete-all-btn:hover {
        background: rgba(255, 0, 0, 0.2);
    }

    .overlay-btn.delete-btn {
        background: rgba(255, 0, 0, 0.3);
    }

    .overlay-btn.delete-btn:hover {
        background: rgba(255, 0, 0, 0.6);
    }

    .generate-btn {
        background: var(--primary);
        color: white;
        border: none;
        padding: 1rem 2rem;
        border-radius: 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-weight: 500;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-size: 1rem;
    }

    .generate-btn:hover {
        background: var(--primary-light);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(147, 51, 234, 0.2);
    }

    .generate-btn:active {
        transform: translateY(0);
    }

    .generate-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
    }

    .generate-btn svg {
        width: 20px;
        height: 20px;
        transition: transform 0.3s ease;
    }

    .generate-btn:hover svg {
        transform: scale(1.1);
    }
`;

// Initialize styles function
function initializeStyles() {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// Initialize everything when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded, initializing...');
    
    // Initialize styles
    initializeStyles();
    
    // Initialize buttons
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    const shareGalleryBtn = document.getElementById('shareGalleryBtn');
    
    if (downloadAllBtn) {
        downloadAllBtn.addEventListener('click', downloadAllImages);
    }
    
    if (shareGalleryBtn) {
        shareGalleryBtn.addEventListener('click', () => {
            const url = window.location.href;
            navigator.clipboard.writeText(url)
                .then(() => showToast('Gallery link copied to clipboard! ✨'))
                .catch(() => showToast('Failed to copy gallery link 😔'));
        });
    }
    
    // Check for prompt parameter and handle image generation
    const urlParams = new URLSearchParams(window.location.search);
    const prompt = urlParams.get('prompt');
    
    if (prompt) {
        generateImage(prompt);
    } else {
        // Just display existing images
        const loadingContainer = document.getElementById('loadingContainer');
        if (loadingContainer) {
            loadingContainer.style.display = 'none';
        }
        displayImages();
    }

    addNSFWToggle();
    addDeleteButtons();

    // Initialize generate button
    const generateBtn = document.getElementById('generateBtn');
    const promptInput = document.getElementById('promptInput');

    if (generateBtn && promptInput) {
        generateBtn.addEventListener('click', () => {
            const prompt = promptInput.value.trim();
            if (prompt) {
                generateImage(prompt);
                // Update prompt display
                const promptDisplay = document.getElementById('promptDisplay');
                if (promptDisplay) {
                    promptDisplay.textContent = prompt;
                }
            } else {
                showToast('Please enter a prompt first! ✨');
            }
        });

        // Add enter key support
        promptInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                generateBtn.click();
            }
        });
    }

    // Initialize suggestion chips
    const suggestionChips = document.querySelectorAll('.suggestion-chip');
    suggestionChips.forEach(chip => {
        chip.addEventListener('click', () => {
            if (promptInput) {
                promptInput.value = chip.textContent.trim();
                generateBtn.click();
            }
        });
    });
});

// Update the download all functionality
async function downloadAllImages() {
    const history = loadImageHistory();
    if (history.length === 0) {
        showToast('No images to download 😔');
        return;
    }

    const downloadBtn = document.getElementById('downloadAllBtn');
    downloadBtn.disabled = true;
    showToast('Preparing your images...');

    try {
        const proxyUrl = 'https://api.paxsenix.biz.id/proxy-image?url=';
        const zip = new JSZip();
        const promises = history.map(async (item, index) => {
            try {
                const response = await fetch(`${proxyUrl}${encodeURIComponent(item.imageUrl)}`);
                if (!response.ok) throw new Error('Failed to fetch image');
                const blob = await response.blob();
                zip.file(`stormy-imagination-${index + 1}.png`, blob);
            } catch (error) {
                console.error(`Failed to download image ${index + 1}:`, error);
            }
        });

        await Promise.all(promises);
        showToast('Creating ZIP file...');
        const content = await zip.generateAsync({ type: 'blob' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = 'stormy-imaginations.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        
        showToast('Download complete! ✨');
    } catch (error) {
        console.error('Failed to create ZIP:', error);
        showToast('Failed to download images 😔');
    } finally {
        downloadBtn.disabled = false;
    }
}

// Add click handler
document.getElementById('downloadAllBtn')?.addEventListener('click', downloadAllImages); 