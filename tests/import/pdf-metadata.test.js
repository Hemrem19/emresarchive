import { describe, it, expect } from 'vitest';
import {
    findDoi, cleanDoi, findArxivId, guessTitle, isUsefulTitle, titleFromFileName, titleSimilarity,
    normalizeTitle, authorsFromInfo,
} from '../../import/pdf-metadata.js';

describe('findDoi', () => {
    it.each([
        ['Journal of Things 12 (2021) 1-10. https://doi.org/10.1016/j.compchemeng.2024.108123 Received 3 May', '10.1016/j.compchemeng.2024.108123'],
        ['DOI: 10.1109/TAC.2020.2981234.', '10.1109/TAC.2020.2981234'],
        ['(doi:10.1021/acs.iecr.0c01234)', '10.1021/acs.iecr.0c01234'],
        ['see 10.1002/(SICI)1097-4636(199709)36:3<301::AID-JBM4>3.0.CO;2-H here', '10.1002/(SICI)1097-4636(199709)36:3'],
        ['doi 10.1038/s41586-021-03819-2,', '10.1038/s41586-021-03819-2'],
    ])('finds the DOI in %s', (text, doi) => expect(findDoi(text)).toBe(doi));

    it('prefers the DOI stored with the file', () => {
        expect(findDoi('cites 10.1000/other', { 'prism:doi': '10.5555/own.1' })).toBe('10.5555/own.1');
    });

    it('takes the first DOI, which on page 1 is the paper\'s own', () => {
        expect(findDoi('https://doi.org/10.1016/j.own.2024.1 Introduction ... [1] 10.1109/cited.2020.2')).toBe('10.1016/j.own.2024.1');
    });

    it('returns null without a DOI', () => {
        expect(findDoi('A paper without identifiers, version 10.5 of the data')).toBeNull();
    });

    it('keeps brackets that belong to the DOI', () => {
        expect(cleanDoi('10.1016/S0140-6736(20)30183-5).')).toBe('10.1016/S0140-6736(20)30183-5');
    });
});

describe('findArxivId', () => {
    it.each([
        ['arXiv:2310.00123v2 [cs.LG] 3 Oct 2023', { id: '2310.00123', modern: true }],
        ['Available at https://arxiv.org/abs/1801.01290', { id: '1801.01290', modern: true }],
        ['arXiv:hep-th/9901001', { id: 'hep-th/9901001', modern: false }],
    ])('reads %s', (text, expected) => expect(findArxivId(text)).toEqual(expected));

    it('ignores numbers that only look like ids', () => {
        expect(findArxivId('Table 2310.00123 shows')).toBeNull();
    });
});

describe('titles', () => {
    it.each(['Microsoft Word - draft.docx', 'untitled', 'paper.pdf', 'Short', 'ms_final_v3', 'pone.0000308 1..5'])('rejects "%s" as a title', (t) => {
        expect(isUsefulTitle(t)).toBe(false);
    });

    it('uses a real Title property', () => {
        expect(guessTitle({ Title: 'Soft Actor-Critic: Off-Policy Maximum Entropy Deep RL' }, [], 'x.pdf'))
            .toBe('Soft Actor-Critic: Off-Policy Maximum Entropy Deep RL');
    });

    it('falls back to the largest text at the top of page 1, in reading order', () => {
        const items = [
            { str: 'Journal of Process Control', size: 9, y: 780 },
            { str: 'Reinforcement learning for', size: 18, y: 700 },
            { str: 'chemical process control', size: 18, y: 680 },
            { str: 'A. Author, B. Author', size: 11, y: 650 },
        ];
        expect(guessTitle({ Title: 'Microsoft Word - final.docx' }, items, 'x.pdf'))
            .toBe('Reinforcement learning for chemical process control');
    });

    it('falls back to the file name', () => {
        expect(guessTitle({}, [], 'Optimal_control-of_reactors.pdf')).toBe('Optimal control of reactors');
        expect(titleFromFileName('.pdf')).toBe('Untitled');
    });

    it('scores near-identical titles high and different ones low', () => {
        expect(titleSimilarity('Soft Actor-Critic: Off-Policy RL', 'Soft actor critic — off policy RL')).toBe(1);
        expect(titleSimilarity('Deep learning for control', 'Deep learning for vision')).toBeLessThan(0.9);
        expect(titleSimilarity('', 'x')).toBe(0);
        expect(normalizeTitle('Café: A Study!')).toBe('cafe a study');
    });
});

describe('authorsFromInfo', () => {
    it.each([
        ['A. Smith; B. Jones', ['A. Smith', 'B. Jones']],
        ['A. Smith, B. Jones and C. Lee', ['A. Smith', 'B. Jones', 'C. Lee']],
        ['Smith, John', ['Smith, John']],
        ['', []],
    ])('reads "%s"', (author, expected) => expect(authorsFromInfo({ Author: author })).toEqual(expected));
});
