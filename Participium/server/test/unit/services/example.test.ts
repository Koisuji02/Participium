// Esempio di test unitario per un service

describe('Example Unit Test', () => {
  describe('Sample Function', () => {
    it('should pass basic test', () => {
      expect(1 + 1).toBe(2);
    });

    it('should handle strings', () => {
      const result = 'hello'.toUpperCase();
      expect(result).toBe('HELLO');
    });
  });
});
