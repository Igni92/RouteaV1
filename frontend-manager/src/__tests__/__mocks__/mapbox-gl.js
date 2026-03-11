/**
 * mapbox-gl mock for Jest (jsdom environment)
 * mapbox-gl uses WebGL which is not available in jsdom.
 */

const mapboxgl = {
  Map: jest.fn().mockImplementation(() => ({
    addControl: jest.fn(),
    remove: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    setCenter: jest.fn(),
    setZoom: jest.fn(),
    getCanvas: jest.fn(() => ({ style: {} })),
    isStyleLoaded: jest.fn(() => true),
  })),
  Marker: jest.fn().mockImplementation(() => ({
    setLngLat: jest.fn().mockReturnThis(),
    setPopup: jest.fn().mockReturnThis(),
    addTo: jest.fn().mockReturnThis(),
    remove: jest.fn(),
    getElement: jest.fn(() => {
      const el = document.createElement('div');
      el.style.backgroundColor = '';
      return el;
    }),
  })),
  Popup: jest.fn().mockImplementation(() => ({
    setHTML: jest.fn().mockReturnThis(),
    setLngLat: jest.fn().mockReturnThis(),
  })),
  NavigationControl: jest.fn(),
  ScaleControl: jest.fn(),
  accessToken: '',
};

module.exports = mapboxgl;
