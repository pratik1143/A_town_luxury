import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  setDoc,
  serverTimestamp,
  getDocs,
  runTransaction
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';

// Custom Event Emitter for LocalStorage Realtime Simulation
class LocalEventEmitter {
  private listeners: { [key: string]: Function[] } = {};

  subscribe(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  emit(event: string, data?: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }
}

const localEmitter = new LocalEventEmitter();

const DEFAULT_CATEGORIES: any[] = [
  { id: 'cat-mens-wear', name: "Men's Wear", description: "Premium Men's apparel and accessories", createdAt: new Date().toISOString() },
  { id: 'cat-womens-wear', name: "Women's Wear", description: "Designer Women's collection and outfits", createdAt: new Date().toISOString() },
  { id: 'cat-kids-wear', name: "Kids Wear", description: "Stylish and comfortable outfits for kids", createdAt: new Date().toISOString() },
  { id: 'cat-footwear', name: "Footwear", description: "Branded, sports, casual, and formal footwear", createdAt: new Date().toISOString() },
  { id: 'cat-accessories', name: "Accessories", description: "Luxury watches, belts, wallets, caps, and sunglasses", createdAt: new Date().toISOString() }
];

const DEFAULT_PRODUCTS: any[] = [];

const DEFAULT_LOGS: any[] = [];

// Helper to initialize local storage
const initLocalStorage = () => {
  // If the user has old dummy products, clear them
  const products = localStorage.getItem('town_products');
  if (products && products.includes('prod-1')) {
    localStorage.removeItem('town_categories');
    localStorage.removeItem('town_products');
    localStorage.removeItem('town_logs');
    localStorage.removeItem('town_bills_registry');
    localStorage.removeItem('town_label_logs');
  }

  // Seed categories if missing or empty, or contains old categories
  const localCats = localStorage.getItem('town_categories');
  const hasOldCats = localCats && JSON.parse(localCats).some((c: any) => c.name.includes('Bedding') || c.id === 'cat-1');
  
  if (!localCats || JSON.parse(localCats).length === 0 || hasOldCats) {
    localStorage.setItem('town_categories', JSON.stringify(DEFAULT_CATEGORIES));
    // Clear out old products to avoid category mismatches
    localStorage.removeItem('town_products');
    localStorage.removeItem('town_logs');
  }

  // Seed products if missing or empty
  const localProds = localStorage.getItem('town_products');
  if (!localProds || JSON.parse(localProds).length === 0) {
    localStorage.setItem('town_products', JSON.stringify(DEFAULT_PRODUCTS));
  }

  if (!localStorage.getItem('town_logs')) {
    localStorage.setItem('town_logs', JSON.stringify(DEFAULT_LOGS));
  }
  if (!localStorage.getItem('town_activity_logs')) {
    localStorage.setItem('town_activity_logs', JSON.stringify([]));
  }

  // Migrate existing product images to use premium generated ones
  const prodsRaw = localStorage.getItem('town_products');
  if (prodsRaw) {
    try {
      const prods = JSON.parse(prodsRaw);
      let changed = false;
      const updatedProds = prods.map((p: any) => {
        const nameLower = (p.name || '').toLowerCase();
        const subCatLower = (p.subCategory || '').toLowerCase();
        
        // If image is the default Nike shoe or Unsplash, or is blank
        const isDefaultImage = !p.imageUrl || 
                               p.imageUrl.includes('photo-1542291026-7eec264c27ff') || 
                               p.imageUrl.includes('unsplash.com');
                               
        if (isDefaultImage) {
          if (nameLower.includes('cap') || subCatLower.includes('cap') || subCatLower.includes('hat')) {
            p.imageUrl = '/polo_cap.png';
            changed = true;
          } else if (nameLower.includes('shirt') || subCatLower.includes('shirt') || subCatLower.includes('polo')) {
            p.imageUrl = '/polo_tshirt.png';
            changed = true;
          } else if (nameLower.includes('jean') || nameLower.includes('pants') || nameLower.includes('trouser') || subCatLower.includes('jean') || subCatLower.includes('trouser') || subCatLower.includes('pants') || subCatLower.includes('cargo')) {
            p.imageUrl = '/jeans.png';
            changed = true;
          } else if (nameLower.includes('shoe') || nameLower.includes('sneaker') || subCatLower.includes('shoe') || subCatLower.includes('sneaker') || subCatLower.includes('footwear') || subCatLower.includes('sandal')) {
            p.imageUrl = '/shoes.png';
            changed = true;
          } else if (nameLower.includes('watch') || subCatLower.includes('watch')) {
            p.imageUrl = '/watch.png';
            changed = true;
          } else if (nameLower.includes('wallet') || subCatLower.includes('wallet') || nameLower.includes('belt') || subCatLower.includes('belt')) {
            p.imageUrl = '/wallet.png';
            changed = true;
          } else if (nameLower.includes('dress') || subCatLower.includes('dress') || subCatLower.includes('top') || subCatLower.includes('kurti')) {
            p.imageUrl = '/womens_dress.png';
            changed = true;
          } else {
            p.imageUrl = '/luxury_placeholder.png';
            changed = true;
          }
        }
        return p;
      });
      if (changed) {
        localStorage.setItem('town_products', JSON.stringify(updatedProds));
        localEmitter.emit('products_changed');
      }
    } catch (e) {
      console.error(e);
    }
  }
};

initLocalStorage();

// Seed Firestore categories if they do not exist
const seedFirestoreIfNeeded = async () => {
  if (isFirebaseConfigured && db) {
    try {
      const catSnap = await getDocs(collection(db, 'categories'));
      if (catSnap.empty) {
        console.log("A Town Luxury ERP: Seeding default categories to Cloud Firestore...");
        for (const cat of DEFAULT_CATEGORIES) {
          await setDoc(doc(db, 'categories', cat.id), {
            name: cat.name,
            description: cat.description,
            createdAt: serverTimestamp()
          });
        }
        console.log("A Town Luxury ERP: Seeding completed successfully.");
      }
    } catch (error) {
      console.error("A Town Luxury ERP: Failed to seed default categories:", error);
    }
  }
};

seedFirestoreIfNeeded();

// ==========================================
// CATEGORIES SERVICE
// ==========================================

export const listenCategories = (callback: (categories: any[]) => void) => {
  if (isFirebaseConfigured && db) {
    const q = query(collection(db, 'categories'), orderBy('name', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const categories: any[] = [];
      snapshot.forEach((doc) => {
        categories.push({ id: doc.id, ...doc.data() });
      });
      callback(categories);
    }, (error) => {
      console.error("Error listening to categories:", error);
    });
  } else {
    // Local simulation
    const fetchLocal = () => {
      const data = JSON.parse(localStorage.getItem('town_categories') || '[]');
      callback(data);
    };
    fetchLocal();
    return localEmitter.subscribe('categories_changed', fetchLocal);
  }
};

export const addCategory = async (name: string, description: string) => {
  if (isFirebaseConfigured && db) {
    await addDoc(collection(db, 'categories'), {
      name,
      description,
      createdAt: serverTimestamp()
    });
  } else {
    const categories = JSON.parse(localStorage.getItem('town_categories') || '[]');
    // Check unique
    if (categories.some((c: any) => c.name.toLowerCase() === name.toLowerCase())) {
      throw new Error("Category name already exists");
    }
    const newCat = {
      id: 'cat-' + Date.now(),
      name,
      description,
      createdAt: new Date().toISOString()
    };
    categories.push(newCat);
    localStorage.setItem('town_categories', JSON.stringify(categories));
    localEmitter.emit('categories_changed');
  }
};

export const updateCategory = async (id: string, name: string, description: string) => {
  if (isFirebaseConfigured && db) {
    const docRef = doc(db, 'categories', id);
    await updateDoc(docRef, { name, description });
  } else {
    const categories = JSON.parse(localStorage.getItem('town_categories') || '[]');
    const index = categories.findIndex((c: any) => c.id === id);
    if (index !== -1) {
      // Check unique
      if (categories.some((c: any) => c.name.toLowerCase() === name.toLowerCase() && c.id !== id)) {
        throw new Error("Category name already exists");
      }
      categories[index] = { ...categories[index], name, description };
      localStorage.setItem('town_categories', JSON.stringify(categories));
      localEmitter.emit('categories_changed');
      localEmitter.emit('products_changed'); // products page may need re-render for categories
    }
  }
};

export const deleteCategory = async (id: string) => {
  if (isFirebaseConfigured && db) {
    await deleteDoc(doc(db, 'categories', id));
  } else {
    const categories = JSON.parse(localStorage.getItem('town_categories') || '[]');
    const updated = categories.filter((c: any) => c.id !== id);
    localStorage.setItem('town_categories', JSON.stringify(updated));
    
    // Set categoryId to null for products in this category
    const products = JSON.parse(localStorage.getItem('town_products') || '[]');
    const updatedProducts = products.map((p: any) => {
      if (p.categoryId === id) {
        return { ...p, categoryId: null };
      }
      return p;
    });
    localStorage.setItem('town_products', JSON.stringify(updatedProducts));
    
    localEmitter.emit('categories_changed');
    localEmitter.emit('products_changed');
  }
};

// ==========================================
// PRODUCTS SERVICE
// ==========================================

export const listenProducts = (callback: (products: any[]) => void) => {
  if (isFirebaseConfigured && db) {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const products: any[] = [];
      snapshot.forEach((doc) => {
        products.push({ id: doc.id, ...doc.data() });
      });
      callback(products);
    }, (error) => {
      console.error("Error listening to products:", error);
    });
  } else {
    const fetchLocal = () => {
      let data: any[] = JSON.parse(localStorage.getItem('town_products') || '[]');
      let changed = false;
      data = data.map((p: any) => {
        const correctBarcodeId = deriveBarcodeId(p.sku || p.id || String(Date.now()));
        if (p.barcodeId !== correctBarcodeId) {
          changed = true;
          return { ...p, barcodeId: correctBarcodeId };
        }
        return p;
      });
      if (changed) {
        localStorage.setItem('town_products', JSON.stringify(data));
      }
      callback(data);
    };
    fetchLocal();
    return localEmitter.subscribe('products_changed', fetchLocal);
  }
};

// ── Barcode ID ─────────────────────────────────────────────────────────────
// Short 6-digit numeric ID used as the physical barcode on printed labels.
// 6 digits → fat bars → scannable on 203 DPI thermal printers.
const generateBarcodeId = (): string =>
  String(Math.floor(100000 + Math.random() * 900000));

// Deterministic fallback for existing products that don't have a barcodeId yet.
export const deriveBarcodeId = (id: string): string => {
  const nums = id.replace(/\D/g, '');
  if (nums.length >= 6) return nums.slice(-6);
  let h = 0;
  for (const c of id) h = ((h << 5) - h + c.charCodeAt(0)) | 0;
  return String(100000 + Math.abs(h) % 900000);
};

export const addProduct = async (productData: any, user: { uid: string, fullName: string }) => {
  // Every product gets a unique short numeric barcode label ID
  const barcodeId = productData.barcodeId || generateBarcodeId();

  if (isFirebaseConfigured && db) {
    const newDoc = await addDoc(collection(db, 'products'), {
      ...productData,
      barcodeId,
      mrp: Number(productData.mrp),
      sellingPrice: Number(productData.sellingPrice),
      stockQuantity: Number(productData.stockQuantity),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Create Initial Stock Log
    await addDoc(collection(db, 'inventory_logs'), {
      productId: newDoc.id,
      changeQuantity: Number(productData.stockQuantity),
      newStockQuantity: Number(productData.stockQuantity),
      type: 'initial',
      reason: 'Initial stock intake',
      userId: user.uid,
      userName: user.fullName,
      createdAt: serverTimestamp()
    });
  } else {
    const products = JSON.parse(localStorage.getItem('town_products') || '[]');
    // Check SKU Unique
    if (products.some((p: any) => p.sku.toLowerCase() === productData.sku.toLowerCase())) {
      throw new Error("SKU must be unique. This SKU already exists.");
    }
    const newId = 'prod-' + Date.now();
    const newProduct = {
      ...productData,
      id: newId,
      barcodeId,
      mrp: Number(productData.mrp),
      sellingPrice: Number(productData.sellingPrice),
      stockQuantity: Number(productData.stockQuantity),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    products.push(newProduct);
    localStorage.setItem('town_products', JSON.stringify(products));

    // Create log
    const logs = JSON.parse(localStorage.getItem('town_logs') || '[]');
    logs.push({
      id: 'log-' + Date.now(),
      productId: newId,
      changeQuantity: Number(productData.stockQuantity),
      newStockQuantity: Number(productData.stockQuantity),
      type: 'initial',
      reason: 'Initial stock intake',
      userId: user.uid,
      userName: user.fullName,
      createdAt: new Date().toISOString()
    });
    localStorage.setItem('town_logs', JSON.stringify(logs));
    
    await addActivityLog("Product Created", `Intaked new product: ${productData.brand} ${productData.name} (SKU: ${productData.sku}, Initial Stock: ${productData.stockQuantity})`, user);

    localEmitter.emit('products_changed');
    localEmitter.emit('logs_changed');
  }
};

export const updateProduct = async (id: string, productData: any, user?: { uid: string, fullName: string }) => {
  if (isFirebaseConfigured && db) {
    const docRef = doc(db, 'products', id);
    await updateDoc(docRef, {
      ...productData,
      mrp: Number(productData.mrp),
      sellingPrice: Number(productData.sellingPrice),
      updatedAt: serverTimestamp()
    });
  } else {
    const products = JSON.parse(localStorage.getItem('town_products') || '[]');
    const index = products.findIndex((p: any) => p.id === id);
    if (index !== -1) {
      if (products.some((p: any) => p.sku.toLowerCase() === productData.sku.toLowerCase() && p.id !== id)) {
        throw new Error("SKU must be unique. This SKU already exists.");
      }
      products[index] = {
        ...products[index],
        ...productData,
        mrp: Number(productData.mrp),
        sellingPrice: Number(productData.sellingPrice),
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem('town_products', JSON.stringify(products));
      
      if (user) {
        await addActivityLog("Product Updated", `Updated product details for ${productData.brand} ${productData.name} (SKU: ${productData.sku})`, user);
      }
      
      localEmitter.emit('products_changed');
    }
  }
};

export const deleteProduct = async (id: string, user?: { uid: string, fullName: string }) => {
  if (isFirebaseConfigured && db) {
    await deleteDoc(doc(db, 'products', id));
  } else {
    const products = JSON.parse(localStorage.getItem('town_products') || '[]');
    const matched = products.find((p: any) => p.id === id);
    const updated = products.filter((p: any) => p.id !== id);
    localStorage.setItem('town_products', JSON.stringify(updated));

    // Delete associated logs
    const logs = JSON.parse(localStorage.getItem('town_logs') || '[]');
    const updatedLogs = logs.filter((l: any) => l.productId !== id);
    localStorage.setItem('town_logs', JSON.stringify(updatedLogs));

    if (user && matched) {
      await addActivityLog("Product Deleted", `Removed product: ${matched.brand} ${matched.name} (SKU: ${matched.sku})`, user);
    }

    localEmitter.emit('products_changed');
    localEmitter.emit('logs_changed');
  }
};

// ==========================================
// INVENTORY & LOGS SERVICE
// ==========================================

export const listenLogs = (callback: (logs: any[]) => void) => {
  if (isFirebaseConfigured && db) {
    const q = query(collection(db, 'inventory_logs'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const logs: any[] = [];
      snapshot.forEach((doc) => {
        logs.push({ id: doc.id, ...doc.data() });
      });
      callback(logs);
    }, (error) => {
      console.error("Error listening to logs:", error);
    });
  } else {
    const fetchLocal = () => {
      const data = JSON.parse(localStorage.getItem('town_logs') || '[]');
      callback(data);
    };
    fetchLocal();
    return localEmitter.subscribe('logs_changed', fetchLocal);
  }
};

export const adjustStock = async (
  productId: string, 
  changeQuantity: number, 
  reason: string, 
  user: { uid: string, fullName: string }
) => {
  if (isFirebaseConfigured && db) {
    const productRef = doc(db, 'products', productId);
    let newStock = 0;
    let brand = '';
    let name = '';
    let sku = '';

    await runTransaction(db, async (transaction) => {
      const productDoc = await transaction.get(productRef);
      if (!productDoc.exists()) {
        throw new Error("Product does not exist.");
      }
      const data = productDoc.data();
      brand = data.brand || '';
      name = data.name || '';
      sku = data.sku || '';
      const currentStock = Number(data.stockQuantity) || 0;
      newStock = currentStock + changeQuantity;
      if (newStock < 0) {
        throw new Error("Adjusted stock cannot drop below 0.");
      }
      transaction.update(productRef, {
        stockQuantity: newStock,
        updatedAt: serverTimestamp()
      });
    });

    await addDoc(collection(db, 'inventory_logs'), {
      productId,
      changeQuantity,
      newStockQuantity: newStock,
      type: 'manual_update',
      reason: reason || 'Manual stock update',
      userId: user.uid,
      userName: user.fullName,
      createdAt: serverTimestamp()
    });

    await addActivityLog(
      "Stock Adjusted",
      `Adjusted stock for ${brand} ${name} (SKU: ${sku}) by ${changeQuantity > 0 ? '+' : ''}${changeQuantity}. Reason: ${reason || 'Manual update'}`,
      user
    );
  } else {
    const products = JSON.parse(localStorage.getItem('town_products') || '[]');
    const index = products.findIndex((p: any) => p.id === productId);
    if (index !== -1) {
      const currentStock = products[index].stockQuantity || 0;
      const newStock = currentStock + changeQuantity;
      if (newStock < 0) {
        throw new Error("Adjusted stock cannot drop below 0.");
      }
      
      products[index].stockQuantity = newStock;
      products[index].updatedAt = new Date().toISOString();
      localStorage.setItem('town_products', JSON.stringify(products));

      // Log it
      const logs = JSON.parse(localStorage.getItem('town_logs') || '[]');
      logs.push({
        id: 'log-' + Date.now(),
        productId,
        changeQuantity,
        newStockQuantity: newStock,
        type: 'manual_update',
        reason: reason || 'Manual stock update',
        userId: user.uid,
        userName: user.fullName,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('town_logs', JSON.stringify(logs));

      await addActivityLog("Stock Adjusted", `Adjusted stock for ${products[index].brand} ${products[index].name} (SKU: ${products[index].sku}) by ${changeQuantity > 0 ? '+' : ''}${changeQuantity}. Reason: ${reason || 'Manual update'}`, user);

      localEmitter.emit('products_changed');
      localEmitter.emit('logs_changed');
    }
  }
};

// Seeding Firestore script
export const seedFirestore = async () => {
  if (!isFirebaseConfigured || !db) return "Firebase not configured";
  try {
    // Check if categories are empty
    const catSnap = await getDocs(collection(db, 'categories'));
    if (catSnap.empty) {
      // Seed categories
      for (const cat of DEFAULT_CATEGORIES) {
        await setDoc(doc(db, 'categories', cat.id), {
          name: cat.name,
          description: cat.description,
          createdAt: serverTimestamp()
        });
      }
      // Seed products
      for (const prod of DEFAULT_PRODUCTS) {
        await setDoc(doc(db, 'products', prod.id), {
          name: prod.name,
          sku: prod.sku,
          brand: prod.brand,
          categoryId: prod.categoryId,
          size: prod.size,
          color: prod.color,
          mrp: prod.mrp,
          sellingPrice: prod.sellingPrice,
          stockQuantity: prod.stockQuantity,
          description: prod.description,
          imageUrl: prod.imageUrl,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      // Seed logs
      for (const l of DEFAULT_LOGS) {
        await setDoc(doc(db, 'inventory_logs', l.id), {
          productId: l.productId,
          changeQuantity: l.changeQuantity,
          newStockQuantity: l.newStockQuantity,
          type: l.type,
          reason: l.reason,
          userId: l.userId,
          userName: l.userName,
          createdAt: serverTimestamp()
        });
      }
      return "Seeding successful";
    }
    return "Firestore already contains data";
  } catch (error: any) {
    console.error("Error seeding Firestore:", error);
    return "Seeding failed: " + error.message;
  }
};

// ==========================================
// LABEL PRINT LOGS SERVICE
// ==========================================
export const listenLabelLogs = (callback: (logs: any[]) => void) => {
  if (isFirebaseConfigured && db) {
    const q = query(collection(db, 'label_logs'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const logs: any[] = [];
      snapshot.forEach((doc) => {
        logs.push({ id: doc.id, ...doc.data() });
      });
      callback(logs);
    }, (error) => {
      console.error("Error listening to label logs:", error);
    });
  } else {
    const fetchLocal = () => {
      const data = JSON.parse(localStorage.getItem('town_label_logs') || '[]');
      callback(data);
    };
    fetchLocal();
    return localEmitter.subscribe('label_logs_changed', fetchLocal);
  }
};

export const addLabelLog = async (labelData: any, user: { uid: string, fullName: string } | null) => {
  const userDetails = user || { uid: 'guest-id', fullName: 'Mr Harish Chaudhary' };
  if (isFirebaseConfigured && db) {
    await addDoc(collection(db, 'label_logs'), {
      ...labelData,
      userId: userDetails.uid,
      userName: userDetails.fullName,
      createdAt: serverTimestamp()
    });
  } else {
    const logs = JSON.parse(localStorage.getItem('town_label_logs') || '[]');
    const newLog = {
      id: 'label-log-' + Date.now(),
      ...labelData,
      userId: userDetails.uid,
      userName: userDetails.fullName,
      createdAt: new Date().toISOString()
    };
    logs.push(newLog);
    localStorage.setItem('town_label_logs', JSON.stringify(logs));
    localEmitter.emit('label_logs_changed');
  }
};

// ==========================================
// CRM CUSTOMERS SERVICE
// ==========================================
export const listenCustomers = (callback: (customers: any[]) => void) => {
  if (isFirebaseConfigured && db) {
    const q = query(collection(db, 'customers'), orderBy('name', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      callback(list);
    }, (error) => {
      console.error("Error listening to customers:", error);
    });
  } else {
    const fetchLocal = () => {
      const data = JSON.parse(localStorage.getItem('town_customers') || '[]');
      callback(data);
    };
    fetchLocal();
    return localEmitter.subscribe('customers_changed', fetchLocal);
  }
};

export const addCustomer = async (customerData: any, user?: { uid: string, fullName: string }) => {
  if (isFirebaseConfigured && db) {
    await addDoc(collection(db, 'customers'), {
      ...customerData,
      rewardPoints: Number(customerData.rewardPoints || 0),
      walletBalance: Number(customerData.walletBalance || 0),
      createdAt: serverTimestamp()
    });
  } else {
    const list = JSON.parse(localStorage.getItem('town_customers') || '[]');
    const newCust = {
      id: 'cust-' + Date.now(),
      ...customerData,
      rewardPoints: Number(customerData.rewardPoints || 0),
      walletBalance: Number(customerData.walletBalance || 0),
      createdAt: new Date().toISOString()
    };
    list.push(newCust);
    localStorage.setItem('town_customers', JSON.stringify(list));
    
    if (user) {
      await addActivityLog("Customer CRM Created", `Registered new customer profile: ${customerData.name} (${customerData.phone || customerData.mobileNumber})`, user);
    }
    
    localEmitter.emit('customers_changed');
  }
};

export const updateCustomer = async (id: string, customerData: any, user?: { uid: string, fullName: string }) => {
  if (isFirebaseConfigured && db) {
    const docRef = doc(db, 'customers', id);
    await updateDoc(docRef, customerData);
  } else {
    const list = JSON.parse(localStorage.getItem('town_customers') || '[]');
    const idx = list.findIndex((c: any) => c.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...customerData };
      localStorage.setItem('town_customers', JSON.stringify(list));
      
      if (user) {
        await addActivityLog("Customer CRM Updated", `Updated profile/wallet for customer: ${list[idx].name}`, user);
      }
      
      localEmitter.emit('customers_changed');
    }
  }
};

// ==========================================
// SUPPLIERS SERVICE
// ==========================================
export const listenSuppliers = (callback: (suppliers: any[]) => void) => {
  if (isFirebaseConfigured && db) {
    const q = query(collection(db, 'suppliers'), orderBy('name', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      callback(list);
    }, (error) => {
      console.error("Error listening to suppliers:", error);
    });
  } else {
    const fetchLocal = () => {
      const data = JSON.parse(localStorage.getItem('town_suppliers') || '[]');
      callback(data);
    };
    fetchLocal();
    return localEmitter.subscribe('suppliers_changed', fetchLocal);
  }
};

export const addSupplier = async (supplierData: any, user?: { uid: string, fullName: string }) => {
  if (isFirebaseConfigured && db) {
    await addDoc(collection(db, 'suppliers'), {
      ...supplierData,
      createdAt: serverTimestamp()
    });
  } else {
    const list = JSON.parse(localStorage.getItem('town_suppliers') || '[]');
    const newSupp = {
      id: 'supp-' + Date.now(),
      ...supplierData,
      createdAt: new Date().toISOString()
    };
    list.push(newSupp);
    localStorage.setItem('town_suppliers', JSON.stringify(list));
    
    if (user) {
      await addActivityLog("Supplier Registered", `Registered new vendor supplier profile: ${supplierData.name}`, user);
    }
    
    localEmitter.emit('suppliers_changed');
  }
};

export const updateSupplier = async (id: string, supplierData: any, user?: { uid: string, fullName: string }) => {
  if (isFirebaseConfigured && db) {
    const docRef = doc(db, 'suppliers', id);
    await updateDoc(docRef, supplierData);
  } else {
    const list = JSON.parse(localStorage.getItem('town_suppliers') || '[]');
    const idx = list.findIndex((s: any) => s.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...supplierData };
      localStorage.setItem('town_suppliers', JSON.stringify(list));
      
      if (user) {
        await addActivityLog("Supplier Updated", `Updated vendor profile details for: ${list[idx].name}`, user);
      }
      
      localEmitter.emit('suppliers_changed');
    }
  }
};

// ==========================================
// PURCHASE ORDERS SERVICE
// ==========================================
export const listenPurchaseOrders = (callback: (pos: any[]) => void) => {
  if (isFirebaseConfigured && db) {
    const q = query(collection(db, 'purchase_orders'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      callback(list);
    }, (error) => {
      console.error("Error listening to purchase orders:", error);
    });
  } else {
    const fetchLocal = () => {
      const data = JSON.parse(localStorage.getItem('town_purchase_orders') || '[]');
      callback(data);
    };
    fetchLocal();
    return localEmitter.subscribe('po_changed', fetchLocal);
  }
};

export const addPurchaseOrder = async (poData: any, user?: { uid: string, fullName: string }) => {
  if (isFirebaseConfigured && db) {
    await addDoc(collection(db, 'purchase_orders'), {
      ...poData,
      createdAt: serverTimestamp()
    });
  } else {
    const list = JSON.parse(localStorage.getItem('town_purchase_orders') || '[]');
    const newPO = {
      id: 'po-' + Date.now(),
      ...poData,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    list.push(newPO);
    localStorage.setItem('town_purchase_orders', JSON.stringify(list));
    
    if (user) {
      await addActivityLog("PO Draft Created", `Drafted new Purchase Order (${newPO.id}) to vendor: ${poData.supplierName}`, user);
    }
    
    localEmitter.emit('po_changed');
  }
};

export const completePurchaseOrder = async (id: string, user: { uid: string, fullName: string }) => {
  if (isFirebaseConfigured && db) {
    // Transaction details
  } else {
    const list = JSON.parse(localStorage.getItem('town_purchase_orders') || '[]');
    const idx = list.findIndex((p: any) => p.id === id);
    if (idx !== -1 && list[idx].status !== 'completed') {
      list[idx].status = 'completed';
      list[idx].completedAt = new Date().toISOString();
      localStorage.setItem('town_purchase_orders', JSON.stringify(list));
      
      // Update inventory stocks for each item in the Purchase Order!
      const items = list[idx].items || [];
      for (const item of items) {
        await adjustStock(
          item.productId,
          Number(item.quantity),
          `Procurement Stock In (PO: ${list[idx].id})`,
          user
        );
      }
      
      await addActivityLog("PO Complete Procurement", `Procured and completed Purchase Order (${list[idx].id}) from vendor: ${list[idx].supplierName}`, user);
      
      localEmitter.emit('po_changed');
    }
  }
};

// ==========================================
// SYSTEM SECURITY ACTIVITY LOGS SERVICE
// ==========================================
export const listenActivityLogs = (callback: (logs: any[]) => void) => {
  const fetchLocal = () => {
    const data = JSON.parse(localStorage.getItem('town_activity_logs') || '[]');
    callback(data);
  };
  fetchLocal();
  return localEmitter.subscribe('activity_logs_changed', fetchLocal);
};

export const addActivityLog = async (
  action: string, 
  details: string, 
  user: { uid: string, fullName: string } | null
) => {
  const userDetails = user || { uid: 'system-id', fullName: 'System Daemon' };
  const logs = JSON.parse(localStorage.getItem('town_activity_logs') || '[]');
  const newLog = {
    id: 'act-' + Date.now(),
    action,
    details,
    userId: userDetails.uid,
    userName: userDetails.fullName,
    createdAt: new Date().toISOString()
  };
  logs.unshift(newLog); // newer first
  localStorage.setItem('town_activity_logs', JSON.stringify(logs));
  localEmitter.emit('activity_logs_changed');
};

