/**
 * Rating Input Component
 * Reusable component for rating papers on a 1-10 scale
 */

/**
 * Creates a rating input component
 * @param {Object} options - Component options
 * @param {number|null} options.value - Current rating value (1-10 or null)
 * @param {Function} options.onChange - Callback when rating changes (receives new rating value or null)
 * @param {boolean} options.readOnly - If true, display only (no editing)
 * @param {string} options.size - Size variant: 'sm', 'md', 'lg'
 * @param {string} options.displayMode - Display mode: 'numeric', 'visual', 'compact'
 * @returns {HTMLElement} The rating component element
 */
export function createRatingInput({ 
    value = null, 
    onChange = () => {}, 
    readOnly = false,
    size = 'md',
    displayMode = 'numeric'
}) {
    const container = document.createElement('div');
    container.className = `rating-input rating-input-${size} rating-input-${displayMode}`;
    
    // Validate rating value
    const rating = (value !== null && value >= 1 && value <= 10) ? value : null;
    
    if (readOnly) {
        // Read-only display
        container.innerHTML = renderReadOnly(rating, displayMode, size);
    } else {
        // Interactive input
        container.innerHTML = renderInteractive(rating, displayMode, size);
        setupEventListeners(container, onChange);
    }
    
    return container;
}

/**
 * Renders read-only rating display
 */
function renderReadOnly(rating, displayMode, size) {
    if (rating === null) {
        return `<span class="text-stone-400 dark:text-stone-600 text-sm">Unrated</span>`;
    }
    
    switch (displayMode) {
        case 'visual':
            return renderVisualScale(rating, true);
        case 'compact':
            return `<span class="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                <span class="material-symbols-outlined text-sm">star</span>
                <span>${rating}</span>
            </span>`;
        case 'numeric':
        default:
            return `<span class="text-stone-700 dark:text-stone-300 font-medium">${rating}/10</span>`;
    }
}

/**
 * Renders interactive rating input
 */
function renderInteractive(rating, displayMode, size) {
    if (displayMode === 'slider') {
        return `
            <div class="rating-slider-container">
                <div class="flex items-center gap-3">
                    <input 
                        type="range" 
                        id="rating-slider" 
                        min="1" 
                        max="10" 
                        value="${rating || 5}" 
                        step="1"
                        class="flex-1 h-2 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div class="flex items-center gap-2 min-w-[60px]">
                        <span id="rating-value" class="text-lg font-bold text-stone-900 dark:text-white">${rating || '-'}</span>
                        <span class="text-stone-500 dark:text-stone-400">/10</span>
                    </div>
                </div>
                <div class="flex justify-between text-xs text-stone-400 dark:text-stone-600 mt-1">
                    <span>1</span>
                    <span>5</span>
                    <span>10</span>
                </div>
                <button 
                    id="clear-rating-btn" 
                    class="mt-2 text-xs text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 underline"
                    ${rating === null ? 'style="display: none;"' : ''}
                >
                    Clear Rating
                </button>
            </div>
        `;
    } else if (displayMode === 'dropdown') {
        const options = Array.from({ length: 10 }, (_, i) => i + 1)
            .map(num => `<option value="${num}" ${rating === num ? 'selected' : ''}>${num} - ${getRatingLabel(num)}</option>`)
            .join('');
        
        return `
            <div class="rating-dropdown-container">
                <select 
                    id="rating-select" 
                    class="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-primary focus:border-primary"
                >
                    <option value="">Select Rating</option>
                    ${options}
                </select>
                <button 
                    id="clear-rating-btn" 
                    class="mt-2 text-xs text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 underline"
                    ${rating === null ? 'style="display: none;"' : ''}
                >
                    Clear Rating
                </button>
            </div>
        `;
    } else {
        // Visual scale (default)
        return `
            <div class="rating-visual-container">
                <div class="flex items-center gap-2 mb-2">
                    ${renderVisualScale(rating, false)}
                </div>
                <div class="flex items-center gap-2">
                    <span id="rating-value" class="text-sm font-medium text-stone-700 dark:text-stone-300">${rating ? `${rating}/10` : 'Click to rate'}</span>
                    ${rating !== null ? `
                        <button 
                            id="clear-rating-btn" 
                            class="text-xs text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 underline ml-auto"
                        >
                            Clear
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }
}

/**
 * Renders visual scale (10 segments)
 */
function renderVisualScale(rating, readOnly) {
    const segments = Array.from({ length: 10 }, (_, i) => {
        const num = i + 1;
        const isFilled = rating !== null && num <= rating;
        const segmentClass = readOnly 
            ? `rating-segment ${isFilled ? 'filled' : 'empty'}`
            : `rating-segment clickable ${isFilled ? 'filled' : 'empty'}`;
        
        return `<div 
            class="${segmentClass}" 
            data-rating="${num}"
            title="${num}/10"
        ></div>`;
    }).join('');
    
    return `<div class="rating-scale flex gap-1">${segments}</div>`;
}

/**
 * Gets label for rating value
 */
function getRatingLabel(rating) {
    const labels = {
        1: 'Poor',
        2: 'Fair',
        3: 'Below Average',
        4: 'Average',
        5: 'Above Average',
        6: 'Good',
        7: 'Very Good',
        8: 'Excellent',
        9: 'Outstanding',
        10: 'Exceptional'
    };
    return labels[rating] || '';
}

/**
 * Sets up event listeners for interactive rating
 */
function setupEventListeners(container, onChange) {
    const slider = container.querySelector('#rating-slider');
    const select = container.querySelector('#rating-select');
    const clearBtn = container.querySelector('#clear-rating-btn');
    const segments = container.querySelectorAll('.rating-segment.clickable');
    const valueDisplay = container.querySelector('#rating-value');
    
    // Slider handler
    if (slider) {
        slider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            if (valueDisplay) {
                valueDisplay.textContent = value;
            }
            onChange(value);
            if (clearBtn) clearBtn.style.display = 'block';
        });
    }
    
    // Dropdown handler
    if (select) {
        select.addEventListener('change', (e) => {
            const value = e.target.value ? parseInt(e.target.value) : null;
            onChange(value);
            if (clearBtn) {
                clearBtn.style.display = value ? 'block' : 'none';
            }
        });
    }
    
    // Visual scale handler
    segments.forEach(segment => {
        segment.addEventListener('click', (e) => {
            const value = parseInt(e.target.dataset.rating);
            updateVisualScale(container, value);
            onChange(value);
            if (valueDisplay) {
                valueDisplay.textContent = `${value}/10`;
            }
            if (clearBtn) clearBtn.style.display = 'block';
        });
        
        segment.addEventListener('mouseenter', (e) => {
            if (!readOnly) {
                const hoverValue = parseInt(e.target.dataset.rating);
                previewVisualScale(container, hoverValue);
            }
        });
    });
    
    // Clear button handler
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (slider) {
                slider.value = 5;
                if (valueDisplay) valueDisplay.textContent = '-';
            }
            if (select) select.value = '';
            if (segments.length > 0) {
                updateVisualScale(container, null);
            }
            if (valueDisplay && !slider) {
                valueDisplay.textContent = 'Click to rate';
            }
            clearBtn.style.display = 'none';
            onChange(null);
        });
    }
}

/**
 * Updates visual scale display
 */
function updateVisualScale(container, value) {
    const segments = container.querySelectorAll('.rating-segment');
    segments.forEach((segment, index) => {
        const num = index + 1;
        if (value !== null && num <= value) {
            segment.classList.add('filled');
            segment.classList.remove('empty');
        } else {
            segment.classList.add('empty');
            segment.classList.remove('filled');
        }
    });
}

/**
 * Previews visual scale on hover
 */
function previewVisualScale(container, value) {
    const segments = container.querySelectorAll('.rating-segment.clickable');
    segments.forEach((segment, index) => {
        const num = index + 1;
        if (num <= value) {
            segment.classList.add('preview');
        } else {
            segment.classList.remove('preview');
        }
    });
}

// Add CSS styles
const style = document.createElement('style');
style.textContent = `
    .rating-scale {
        display: flex;
        gap: 2px;
    }
    
    .rating-segment {
        width: 20px;
        height: 20px;
        border-radius: 2px;
        transition: all 0.2s ease;
        cursor: pointer;
    }
    
    .rating-segment.clickable {
        background-color: #e5e7eb;
    }
    
    .rating-segment.clickable:hover {
        background-color: #d1d5db;
        transform: scale(1.1);
    }
    
    .rating-segment.filled {
        background-color: #137fec;
    }
    
    .rating-segment.empty {
        background-color: #e5e7eb;
    }
    
    .dark .rating-segment.clickable {
        background-color: #374151;
    }
    
    .dark .rating-segment.clickable:hover {
        background-color: #4b5563;
    }
    
    .dark .rating-segment.filled {
        background-color: #137fec;
    }
    
    .dark .rating-segment.empty {
        background-color: #374151;
    }
    
    .rating-segment.preview {
        background-color: #60a5fa;
    }
    
    .rating-input-sm .rating-segment {
        width: 16px;
        height: 16px;
    }
    
    .rating-input-lg .rating-segment {
        width: 24px;
        height: 24px;
    }
    
    #rating-slider {
        -webkit-appearance: none;
        appearance: none;
    }
    
    #rating-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #137fec;
        cursor: pointer;
    }
    
    #rating-slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #137fec;
        cursor: pointer;
        border: none;
    }
`;

if (!document.getElementById('rating-input-styles')) {
    style.id = 'rating-input-styles';
    document.head.appendChild(style);
}

