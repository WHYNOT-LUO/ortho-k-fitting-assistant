import type { Eye } from '../domain/types';

/** Chart colours. Same values as --od / --os in styles.css (validated with the dataviz palette checker). */
export const EYE_COLORS: Record<Eye, string> = { OD: '#2a78d6', OS: '#eb6834' };
export const GRID_COLOR = '#e6eaee';
export const AXIS_TEXT = '#5d6d78';
/** Single-series charts use the app's primary colour (not an eye colour, to avoid implying OD/OS). */
export const SINGLE_SERIES = '#0f6e8c';
