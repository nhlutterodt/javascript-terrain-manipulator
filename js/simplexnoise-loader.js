// SimplexNoise loader for ES6 modules (global workaround)
(function() {
    if (typeof window !== 'undefined' && !window.SimplexNoise) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/simplex-noise/2.4.0/simplex-noise.min.js';
        script.onload = () => {
            console.log('SimplexNoise loaded');
        };
        document.head.appendChild(script);
    }
})();
