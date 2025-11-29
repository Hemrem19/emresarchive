// Tests for components/rating-input.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRatingInput } from '../../components/rating-input.js';

describe('components/rating-input.js', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('createRatingInput', () => {
    it('should create a rating input component', () => {
      const component = createRatingInput({
        value: 5,
        onChange: () => {}
      });

      expect(component).toBeInstanceOf(HTMLElement);
      expect(component.classList.contains('rating-input')).toBe(true);
    });

    it('should display current rating value', () => {
      const component = createRatingInput({
        value: 7,
        onChange: () => {},
        displayMode: 'slider'
      });

      const valueDisplay = component.querySelector('#rating-value');
      expect(valueDisplay).toBeTruthy();
      expect(valueDisplay.textContent.trim()).toBe('7');
    });

    it('should display "Unrated" for null rating in read-only mode', () => {
      const component = createRatingInput({
        value: null,
        onChange: () => {},
        readOnly: true
      });

      const text = component.textContent;
      expect(text).toContain('Unrated');
    });

    it('should display rating in compact mode', () => {
      const component = createRatingInput({
        value: 8,
        onChange: () => {},
        displayMode: 'compact',
        readOnly: true
      });

      const text = component.textContent;
      expect(text).toContain('8');
    });

    it('should display rating in numeric mode', () => {
      const component = createRatingInput({
        value: 6,
        onChange: () => {},
        displayMode: 'numeric',
        readOnly: true
      });

      const text = component.textContent;
      expect(text).toContain('6/10');
    });

    it('should create slider input when displayMode is slider', () => {
      const component = createRatingInput({
        value: 5,
        onChange: () => {},
        displayMode: 'slider'
      });

      const slider = component.querySelector('#rating-slider');
      expect(slider).toBeTruthy();
      expect(slider.type).toBe('range');
      expect(slider.min).toBe('1');
      expect(slider.max).toBe('10');
      expect(slider.value).toBe('5');
    });

    it('should create dropdown input when displayMode is dropdown', () => {
      const component = createRatingInput({
        value: 3,
        onChange: () => {},
        displayMode: 'dropdown'
      });

      const select = component.querySelector('#rating-select');
      expect(select).toBeTruthy();
      expect(select.tagName).toBe('SELECT');
    });

    it('should call onChange when slider value changes', () => {
      const onChange = vi.fn();
      const component = createRatingInput({
        value: 5,
        onChange,
        displayMode: 'slider'
      });

      const slider = component.querySelector('#rating-slider');
      slider.value = '8';
      slider.dispatchEvent(new Event('input'));

      expect(onChange).toHaveBeenCalledWith(8);
    });

    it('should call onChange when dropdown value changes', () => {
      const onChange = vi.fn();
      const component = createRatingInput({
        value: null,
        onChange,
        displayMode: 'dropdown'
      });

      const select = component.querySelector('#rating-select');
      select.value = '7';
      select.dispatchEvent(new Event('change'));

      expect(onChange).toHaveBeenCalledWith(7);
    });

    it('should call onChange with null when dropdown is cleared', () => {
      const onChange = vi.fn();
      const component = createRatingInput({
        value: 5,
        onChange,
        displayMode: 'dropdown'
      });

      const select = component.querySelector('#rating-select');
      select.value = '';
      select.dispatchEvent(new Event('change'));

      expect(onChange).toHaveBeenCalledWith(null);
    });

    it('should show clear button when rating is set', () => {
      const component = createRatingInput({
        value: 5,
        onChange: () => {},
        displayMode: 'slider'
      });

      const clearBtn = component.querySelector('#clear-rating-btn');
      expect(clearBtn).toBeTruthy();
      expect(clearBtn.style.display).not.toBe('none');
    });

    it('should hide clear button when rating is null', () => {
      const component = createRatingInput({
        value: null,
        onChange: () => {},
        displayMode: 'slider'
      });

      const clearBtn = component.querySelector('#clear-rating-btn');
      expect(clearBtn).toBeTruthy();
      expect(clearBtn.style.display).toBe('none');
    });

    it('should clear rating when clear button is clicked', () => {
      const onChange = vi.fn();
      const component = createRatingInput({
        value: 5,
        onChange,
        displayMode: 'slider'
      });

      const clearBtn = component.querySelector('#clear-rating-btn');
      clearBtn.click();

      expect(onChange).toHaveBeenCalledWith(null);
    });

    it('should create visual scale with 10 segments', () => {
      const component = createRatingInput({
        value: 5,
        onChange: () => {},
        displayMode: 'visual'
      });

      const segments = component.querySelectorAll('.rating-segment');
      expect(segments).toHaveLength(10);
    });

    it('should fill segments up to rating value', () => {
      const component = createRatingInput({
        value: 7,
        onChange: () => {},
        displayMode: 'visual',
        readOnly: true
      });

      const segments = component.querySelectorAll('.rating-segment');
      for (let i = 0; i < 7; i++) {
        expect(segments[i].classList.contains('filled')).toBe(true);
      }
      for (let i = 7; i < 10; i++) {
        expect(segments[i].classList.contains('empty')).toBe(true);
      }
    });

    it('should call onChange when segment is clicked', () => {
      const onChange = vi.fn();
      const component = createRatingInput({
        value: null,
        onChange,
        displayMode: 'visual'
      });

      const segments = component.querySelectorAll('.rating-segment.clickable');
      segments[4].click(); // Click 5th segment (rating 5)

      expect(onChange).toHaveBeenCalledWith(5);
    });

    it('should validate rating value (1-10)', () => {
      const component1 = createRatingInput({
        value: 0,
        onChange: () => {}
      });
      const component2 = createRatingInput({
        value: 11,
        onChange: () => {}
      });
      const component3 = createRatingInput({
        value: 5,
        onChange: () => {}
      });

      // Invalid values should be treated as null
      expect(component1.querySelector('#rating-value')?.textContent || component1.textContent).not.toContain('0');
      expect(component2.querySelector('#rating-value')?.textContent || component2.textContent).not.toContain('11');
      expect(component3.querySelector('#rating-value')?.textContent || component3.textContent).toContain('5');
    });

    it('should handle different size variants', () => {
      const small = createRatingInput({
        value: 5,
        onChange: () => {},
        size: 'sm'
      });
      const medium = createRatingInput({
        value: 5,
        onChange: () => {},
        size: 'md'
      });
      const large = createRatingInput({
        value: 5,
        onChange: () => {},
        size: 'lg'
      });

      expect(small.classList.contains('rating-input-sm')).toBe(true);
      expect(medium.classList.contains('rating-input-md')).toBe(true);
      expect(large.classList.contains('rating-input-lg')).toBe(true);
    });
  });
});

