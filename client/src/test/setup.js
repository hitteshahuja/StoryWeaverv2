import React from 'react';
import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Help Vitest find React for JSX transformation
global.React = React;

// Automatically clean up the DOM after each test to prevent memory leaks
afterEach(() => {
  cleanup();
});
