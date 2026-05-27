// Lets TypeScript accept `import './foo.css'` side-effect imports.
// Vite handles the actual CSS bundling at the consumer.
declare module '*.css';
