import { Server } from "socket.io";
import { setIO, getIO } from "../../../src/services/ioService";

// Mock di Socket.IO
jest.mock("socket.io", () => ({
  Server: jest.fn()
}));

describe("ioService", () => {
  let mockIOInstance: jest.Mocked<Server>;

  beforeEach(() => {
    // Crea un mock dell'istanza Socket.IO
    mockIOInstance = {
      on: jest.fn(),
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
      sockets: {
        sockets: new Map()
      }
    } as any;

    // Reset il modulo per ogni test per isolare lo stato
    jest.resetModules();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("setIO", () => {
    it("should set the Socket.IO instance", () => {
      const { setIO, getIO } = require("../../../src/services/ioService");
      
      setIO(mockIOInstance);
      const result = getIO();

      expect(result).toBe(mockIOInstance);
    });

    it("should replace existing instance when called again", () => {
      const { setIO, getIO } = require("../../../src/services/ioService");
      
      const firstInstance = { id: "first" } as any;
      const secondInstance = { id: "second" } as any;

      setIO(firstInstance);
      expect(getIO()).toBe(firstInstance);

      setIO(secondInstance);
      expect(getIO()).toBe(secondInstance);
    });

    it("should accept a valid Socket.IO Server instance", () => {
      const { setIO, getIO } = require("../../../src/services/ioService");
      
      const validInstance = {
        on: jest.fn(),
        emit: jest.fn(),
        to: jest.fn()
      } as any;

      setIO(validInstance);
      const result = getIO();

      expect(result).toBe(validInstance);
      expect(result).toHaveProperty("on");
      expect(result).toHaveProperty("emit");
      expect(result).toHaveProperty("to");
    });
  });

  describe("getIO", () => {
    it("should return null when no instance has been set", () => {
      const { getIO } = require("../../../src/services/ioService");
      
      const result = getIO();

      expect(result).toBeNull();
    });

    it("should return the Socket.IO instance after it has been set", () => {
      const { setIO, getIO } = require("../../../src/services/ioService");
      
      setIO(mockIOInstance);
      const result = getIO();

      expect(result).toBe(mockIOInstance);
      expect(result).not.toBeNull();
    });

    it("should return the same instance on multiple calls", () => {
      const { setIO, getIO } = require("../../../src/services/ioService");
      
      setIO(mockIOInstance);
      
      const firstCall = getIO();
      const secondCall = getIO();
      const thirdCall = getIO();

      expect(firstCall).toBe(mockIOInstance);
      expect(secondCall).toBe(mockIOInstance);
      expect(thirdCall).toBe(mockIOInstance);
      expect(firstCall).toBe(secondCall);
      expect(secondCall).toBe(thirdCall);
    });
  });

  describe("setIO and getIO integration", () => {
    it("should maintain state between setIO and getIO calls", () => {
      const { setIO, getIO } = require("../../../src/services/ioService");
      
      expect(getIO()).toBeNull();

      setIO(mockIOInstance);
      expect(getIO()).toBe(mockIOInstance);

      const anotherInstance = { id: "another" } as any;
      setIO(anotherInstance);
      expect(getIO()).toBe(anotherInstance);
      expect(getIO()).not.toBe(mockIOInstance);
    });

    it("should handle setting null-like values", () => {
      const { setIO, getIO } = require("../../../src/services/ioService");
      
      setIO(mockIOInstance);
      expect(getIO()).toBe(mockIOInstance);

      // Set to null explicitly
      setIO(null as any);
      expect(getIO()).toBeNull();
    });

    it("should work correctly in a typical usage scenario", () => {
      const { setIO, getIO } = require("../../../src/services/ioService");
      
      // Initial state - no instance
      expect(getIO()).toBeNull();

      // Initialize Socket.IO during server startup
      const serverIO = {
        on: jest.fn(),
        emit: jest.fn(),
        to: jest.fn().mockReturnThis()
      } as any;
      
      setIO(serverIO);

      // Use in different parts of the application
      const instance1 = getIO();
      expect(instance1).toBe(serverIO);

      const instance2 = getIO();
      expect(instance2).toBe(serverIO);

      // Both references point to the same instance
      expect(instance1).toBe(instance2);
    });
  });
});