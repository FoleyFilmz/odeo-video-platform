import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertEventSchema, insertRiderSchema, insertPurchaseSchema } from "@shared/schema";
import { setupAuth } from "./auth";
import { createPaypalOrder, capturePaypalOrder, loadPaypalDefault } from "./paypal";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // ===== Events endpoints =====
  app.get("/api/events", async (req, res) => {
    try {
      const events = await storage.getAllEvents();
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Error fetching events" });
    }
  });

  app.get("/api/events/:id", async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const event = await storage.getEvent(eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      res.json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: "Error fetching event" });
    }
  });

  app.post("/api/events", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const validatedData = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(validatedData);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid event data", errors: error.errors });
      }
      console.error("Error creating event:", error);
      res.status(500).json({ message: "Error creating event" });
    }
  });

  app.delete("/api/events/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const eventId = parseInt(req.params.id);
      const deleted = await storage.deleteEvent(eventId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      res.status(200).json({ message: "Event deleted successfully" });
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Error deleting event" });
    }
  });

  // ===== Riders endpoints =====
  app.get("/api/riders", async (req, res) => {
    try {
      const eventId = req.query.eventId ? parseInt(req.query.eventId as string) : undefined;
      
      let riders;
      if (eventId) {
        riders = await storage.getRidersByEventId(eventId);
      } else {
        riders = await storage.getAllRiders();
      }
      
      res.json(riders);
    } catch (error) {
      console.error("Error fetching riders:", error);
      res.status(500).json({ message: "Error fetching riders" });
    }
  });

  app.get("/api/riders/:id", async (req, res) => {
    try {
      const riderId = parseInt(req.params.id);
      const rider = await storage.getRider(riderId);
      
      if (!rider) {
        return res.status(404).json({ message: "Rider not found" });
      }
      
      res.json(rider);
    } catch (error) {
      console.error("Error fetching rider:", error);
      res.status(500).json({ message: "Error fetching rider" });
    }
  });

  app.post("/api/riders", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const validatedData = insertRiderSchema.parse(req.body);
      const rider = await storage.createRider(validatedData);
      res.status(201).json(rider);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid rider data", errors: error.errors });
      }
      console.error("Error creating rider:", error);
      res.status(500).json({ message: "Error creating rider" });
    }
  });

  app.delete("/api/riders/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const riderId = parseInt(req.params.id);
      const deleted = await storage.deleteRider(riderId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Rider not found" });
      }
      
      res.status(200).json({ message: "Rider deleted successfully" });
    } catch (error) {
      console.error("Error deleting rider:", error);
      res.status(500).json({ message: "Error deleting rider" });
    }
  });

  // ===== Purchases endpoints =====
  app.post("/api/purchases", async (req, res) => {
    try {
      const validatedData = insertPurchaseSchema.parse(req.body);
      const purchase = await storage.createPurchase(validatedData);
      res.status(201).json(purchase);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid purchase data", errors: error.errors });
      }
      console.error("Error creating purchase:", error);
      res.status(500).json({ message: "Error creating purchase" });
    }
  });

  app.get("/api/purchases/check", async (req, res) => {
    try {
      const { email, riderId } = req.query;
      
      if (!email || !riderId) {
        return res.status(400).json({ message: "Email and riderId are required" });
      }
      
      const isPurchased = await storage.isVideoPurchased(
        email as string, 
        parseInt(riderId as string)
      );
      
      res.json({ purchased: isPurchased });
    } catch (error) {
      console.error("Error checking purchase:", error);
      res.status(500).json({ message: "Error checking purchase" });
    }
  });

  // ===== Stats endpoints =====
  app.get("/api/stats/sales", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const events = await storage.getAllEvents();
      const salesData = await Promise.all(
        events.map(async (event) => {
          const salesCount = await storage.getSalesByEventId(event.id);
          return {
            eventId: event.id,
            eventName: event.name,
            salesCount,
            revenue: salesCount * 80 // Using default price of $80
          };
        })
      );
      
      res.json(salesData);
    } catch (error) {
      console.error("Error fetching sales data:", error);
      res.status(500).json({ message: "Error fetching sales data" });
    }
  });

  // ===== PayPal endpoints =====
  app.get("/paypal/setup", async (req, res) => {
    await loadPaypalDefault(req, res);
  });

  app.post("/paypal/order", async (req, res) => {
    await createPaypalOrder(req, res);
  });

  app.post("/paypal/order/:orderID/capture", async (req, res) => {
    await capturePaypalOrder(req, res);
  });

  // ===== Stripe endpoints =====
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount } = req.body;
      
      // In a real app, this would create a Stripe payment intent
      // For this implementation, we'll simulate a successful response
      const clientSecret = "pi_simulated_" + Math.random().toString(36).substring(2, 15);
      
      res.json({ clientSecret });
    } catch (error) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Error creating payment intent" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
