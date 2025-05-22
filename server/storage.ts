import { users, events, riders, purchases, type User, type InsertUser, type Event, type InsertEvent, type Rider, type InsertRider, type Purchase, type InsertPurchase } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import connectPg from "connect-pg-simple";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

// Database connection
const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString!);
const db = drizzle(client);

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Events
  getAllEvents(): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  deleteEvent(id: number): Promise<boolean>;

  // Riders
  getAllRiders(): Promise<Rider[]>;
  getRidersByEventId(eventId: number): Promise<Rider[]>;
  getRider(id: number): Promise<Rider | undefined>;
  createRider(rider: InsertRider): Promise<Rider>;
  deleteRider(id: number): Promise<boolean>;

  // Purchases
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  getPurchasesByEmail(email: string): Promise<Purchase[]>;
  isVideoPurchased(email: string, riderId: number): Promise<boolean>;
  getSalesByEventId(eventId: number): Promise<number>;
  
  // Session store
  sessionStore: any;
  
  // Initialize database
  initDb(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private events: Map<number, Event>;
  private riders: Map<number, Rider>;
  private purchases: Map<number, Purchase>;
  private currentUserId: number;
  private currentEventId: number;
  private currentRiderId: number;
  private currentPurchaseId: number;
  sessionStore: any;
  
  async initDb(): Promise<void> {
    // In-memory database is already initialized in constructor
    return Promise.resolve();
  }

  constructor() {
    this.users = new Map();
    this.events = new Map();
    this.riders = new Map();
    this.purchases = new Map();
    this.currentUserId = 1;
    this.currentEventId = 1;
    this.currentRiderId = 1;
    this.currentPurchaseId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });

    // Initialize with admin user
    this.createUser({
      username: "Dylan053108",
      password: "Lucky106$"
    });

    // Initialize with some events
    const eventImages = [
      "https://images.unsplash.com/photo-1609626046544-66a356133387?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1575550959106-5a7defe28b56?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1529833981184-35f8dd0a4df5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1580759028677-3d743a37113a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1551143826-b99555ecad74?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1520244526258-daadec968c4c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
    ];

    const eventNames = [
      "Texas Barrel Racing Championship",
      "Oklahoma Summer Barrel Classic",
      "Wyoming Barrel Racing Showdown",
      "Montana State Barrel Racing",
      "Colorado Barrel Racing Festival",
      "Arizona Fall Barrel Championship"
    ];

    const eventDates = [
      "June 15-17, 2023",
      "July 8-10, 2023",
      "August 5-7, 2023",
      "August 19-21, 2023",
      "September 2-4, 2023",
      "October 14-16, 2023"
    ];

    // Create events
    for (let i = 0; i < 6; i++) {
      this.createEvent({
        name: eventNames[i],
        date: eventDates[i],
        thumbnailUrl: eventImages[i]
      });
    }

    const riderImages = [
      "https://images.unsplash.com/photo-1581375221876-8dbd773689c5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1579202002179-8604d8c63ef5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1532272029390-4f16fa56ca93?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1512073490563-2fca097a4dea?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1561045377-52d3c5db0359?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1548963607-e4ddf7d668ba?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1583771250139-b1d9458f866d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1536844891345-c6e3f7457348?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1564697284179-980a11572e2e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
    ];

    const riderNames = [
      "Jessica Smith", "Michael Johnson", "Sarah Williams", "Emma Davis", 
      "David Miller", "Ashley Brown", "Thomas Wilson", "Rebecca Martinez", 
      "James Taylor", "Sophia Anderson"
    ];

    // Create some riders for each event
    for (let eventId = 1; eventId <= 6; eventId++) {
      for (let i = 0; i < 5; i++) {
        const nameIndex = (eventId - 1) * 5 + i;
        const riderName = nameIndex < 10 ? riderNames[nameIndex] : `Rider ${nameIndex + 1}`;
        const imageIndex = nameIndex % 10;
        
        this.createRider({
          name: riderName,
          eventId: eventId,
          price: 80,
          thumbnailUrl: riderImages[imageIndex],
          videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" // Sample video
        });
      }
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Event methods
  async getAllEvents(): Promise<Event[]> {
    return Array.from(this.events.values());
  }

  async getEvent(id: number): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const id = this.currentEventId++;
    const now = new Date();
    const event: Event = { ...insertEvent, id, createdAt: now };
    this.events.set(id, event);
    return event;
  }

  async deleteEvent(id: number): Promise<boolean> {
    return this.events.delete(id);
  }

  // Rider methods
  async getAllRiders(): Promise<Rider[]> {
    return Array.from(this.riders.values());
  }

  async getRidersByEventId(eventId: number): Promise<Rider[]> {
    return Array.from(this.riders.values()).filter(
      (rider) => rider.eventId === eventId
    );
  }

  async getRider(id: number): Promise<Rider | undefined> {
    return this.riders.get(id);
  }

  async createRider(insertRider: InsertRider): Promise<Rider> {
    const id = this.currentRiderId++;
    const now = new Date();
    const rider: Rider = { ...insertRider, id, createdAt: now };
    this.riders.set(id, rider);
    return rider;
  }

  async deleteRider(id: number): Promise<boolean> {
    return this.riders.delete(id);
  }

  // Purchase methods
  async createPurchase(insertPurchase: InsertPurchase): Promise<Purchase> {
    const id = this.currentPurchaseId++;
    const now = new Date();
    const purchase: Purchase = { ...insertPurchase, id, createdAt: now };
    this.purchases.set(id, purchase);
    return purchase;
  }

  async getPurchasesByEmail(email: string): Promise<Purchase[]> {
    return Array.from(this.purchases.values()).filter(
      (purchase) => purchase.email.toLowerCase() === email.toLowerCase()
    );
  }

  async isVideoPurchased(email: string, riderId: number): Promise<boolean> {
    const purchases = await this.getPurchasesByEmail(email);
    return purchases.some(purchase => purchase.riderId === riderId);
  }

  async getSalesByEventId(eventId: number): Promise<number> {
    const riders = await this.getRidersByEventId(eventId);
    const riderIds = riders.map(r => r.id);
    
    const eventPurchases = Array.from(this.purchases.values()).filter(
      purchase => riderIds.includes(purchase.riderId)
    );
    
    return eventPurchases.length;
  }
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  sessionStore: any;
  
  constructor() {
    // Setup PostgreSQL session store
    this.sessionStore = new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      createTableIfMissing: true
    });
  }
  
  async initDb(): Promise<void> {
    try {
      // Create schema if it doesn't exist
      console.log("Initializing database...");
      
      // Check if the admin user exists
      const adminUser = await this.getUserByUsername("Dylan053108");
      if (!adminUser) {
        // Create admin user
        await this.createUser({
          username: "Dylan053108",
          password: "Lucky106$"
        });
        console.log("Created admin user");
      }
      
      // Check if there are any events
      const allEvents = await this.getAllEvents();
      if (allEvents.length === 0) {
        console.log("Initializing sample data...");
        
        // Create sample events
        const eventImages = [
          "https://images.unsplash.com/photo-1609626046544-66a356133387?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
          "https://images.unsplash.com/photo-1575550959106-5a7defe28b56?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
          "https://images.unsplash.com/photo-1529833981184-35f8dd0a4df5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
          "https://images.unsplash.com/photo-1580759028677-3d743a37113a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
          "https://images.unsplash.com/photo-1551143826-b99555ecad74?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
          "https://images.unsplash.com/photo-1520244526258-daadec968c4c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
        ];

        const eventNames = [
          "Texas Barrel Racing Championship",
          "Oklahoma Summer Barrel Classic",
          "Wyoming Barrel Racing Showdown",
          "Montana State Barrel Racing",
          "Colorado Barrel Racing Festival",
          "Arizona Fall Barrel Championship"
        ];

        const eventDates = [
          "June 15-17, 2023",
          "July 8-10, 2023",
          "August 5-7, 2023",
          "August 19-21, 2023",
          "September 2-4, 2023",
          "October 14-16, 2023"
        ];
        
        // Create events
        const createdEvents: Event[] = [];
        for (let i = 0; i < 6; i++) {
          const event = await this.createEvent({
            name: eventNames[i],
            date: eventDates[i],
            thumbnailUrl: eventImages[i]
          });
          createdEvents.push(event);
        }
        
        // Create riders for each event
        const riderImages = [
          "https://images.unsplash.com/photo-1581375221876-8dbd773689c5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
          "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
          "https://images.unsplash.com/photo-1579202002179-8604d8c63ef5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
          "https://images.unsplash.com/photo-1532272029390-4f16fa56ca93?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
          "https://images.unsplash.com/photo-1512073490563-2fca097a4dea?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
          "https://images.unsplash.com/photo-1561045377-52d3c5db0359?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
          "https://images.unsplash.com/photo-1548963607-e4ddf7d668ba?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
          "https://images.unsplash.com/photo-1583771250139-b1d9458f866d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
          "https://images.unsplash.com/photo-1536844891345-c6e3f7457348?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
          "https://images.unsplash.com/photo-1564697284179-980a11572e2e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
        ];

        const riderNames = [
          "Jessica Smith", "Michael Johnson", "Sarah Williams", "Emma Davis", 
          "David Miller", "Ashley Brown", "Thomas Wilson", "Rebecca Martinez", 
          "James Taylor", "Sophia Anderson"
        ];
        
        for (let eventId = 1; eventId <= 6; eventId++) {
          for (let i = 0; i < 5; i++) {
            const nameIndex = (eventId - 1) * 5 + i;
            const riderName = nameIndex < 10 ? riderNames[nameIndex] : `Rider ${nameIndex + 1}`;
            const imageIndex = nameIndex % 10;
            
            await this.createRider({
              name: riderName,
              eventId: eventId,
              price: 80,
              thumbnailUrl: riderImages[imageIndex],
              videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" // Sample video
            });
          }
        }
        
        console.log("Sample data initialized");
      }
    } catch (error) {
      console.error("Failed to initialize database:", error);
      throw error;
    }
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error("Error getting user:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
      return result[0];
    } catch (error) {
      console.error("Error getting user by username:", error);
      return undefined;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  // Event methods
  async getAllEvents(): Promise<Event[]> {
    return await db.select().from(events).orderBy(events.id);
  }

  async getEvent(id: number): Promise<Event | undefined> {
    const result = await db.select().from(events).where(eq(events.id, id)).limit(1);
    return result[0];
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const result = await db.insert(events).values(event).returning();
    return result[0];
  }

  async deleteEvent(id: number): Promise<boolean> {
    try {
      // Delete related riders first
      const eventRiders = await this.getRidersByEventId(id);
      for (const rider of eventRiders) {
        await this.deleteRider(rider.id);
      }
      
      // Delete the event
      const result = await db.delete(events).where(eq(events.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting event:", error);
      return false;
    }
  }

  // Rider methods
  async getAllRiders(): Promise<Rider[]> {
    return await db.select().from(riders).orderBy(riders.id);
  }

  async getRidersByEventId(eventId: number): Promise<Rider[]> {
    return await db.select().from(riders).where(eq(riders.eventId, eventId)).orderBy(riders.id);
  }

  async getRider(id: number): Promise<Rider | undefined> {
    const result = await db.select().from(riders).where(eq(riders.id, id)).limit(1);
    return result[0];
  }

  async createRider(rider: InsertRider): Promise<Rider> {
    const result = await db.insert(riders).values(rider).returning();
    return result[0];
  }

  async deleteRider(id: number): Promise<boolean> {
    try {
      const result = await db.delete(riders).where(eq(riders.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting rider:", error);
      return false;
    }
  }

  // Purchase methods
  async createPurchase(purchase: InsertPurchase): Promise<Purchase> {
    const result = await db.insert(purchases).values(purchase).returning();
    return result[0];
  }

  async getPurchasesByEmail(email: string): Promise<Purchase[]> {
    return await db.select().from(purchases).where(eq(purchases.email, email.toLowerCase())).orderBy(purchases.id);
  }

  async isVideoPurchased(email: string, riderId: number): Promise<boolean> {
    const result = await db.select().from(purchases)
      .where(eq(purchases.email, email.toLowerCase()))
      .where(eq(purchases.riderId, riderId))
      .limit(1);
    return result.length > 0;
  }

  async getSalesByEventId(eventId: number): Promise<number> {
    // Get riders for this event
    const eventRiders = await this.getRidersByEventId(eventId);
    const riderIds = eventRiders.map(r => r.id);
    
    if (riderIds.length === 0) {
      return 0;
    }
    
    // Count all purchases
    let count = 0;
    
    // Count each rider's purchases
    for (const riderId of riderIds) {
      const riderPurchases = await db.select().from(purchases)
        .where(eq(purchases.riderId, riderId));
      count += riderPurchases.length;
    }
    
    return count;
  }
}

// Use the database storage implementation
export const storage = new DatabaseStorage();
