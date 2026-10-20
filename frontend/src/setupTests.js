import '@testing-library/jest-dom';

// jsdom doesn't implement scrolling; Layout scrolls to the top on every new page
window.scrollTo = () => {};
