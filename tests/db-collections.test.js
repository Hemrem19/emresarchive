// Tests for db/collections.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openDB } from '../db/core.js';
import { addCollection, getAllCollections, getCollectionById, updateCollection, deleteCollection } from '../db/collections.js';
import { createMockCollection } from './helpers.js';

describe('db/collections.js', () => {
  beforeEach(async () => {
    await openDB();
  });

  afterEach(async () => {
    const db = await openDB();
    const tx = db.transaction('collections', 'readwrite');
    await tx.objectStore('collections').clear();
    await tx.done;
  });

  describe('addCollection', () => {
    it('should add a new collection to the database', async () => {
      const collection = createMockCollection({ id: undefined });
      delete collection.id;

      const collectionId = await addCollection(collection);

      expect(collectionId).toBeDefined();
      expect(typeof collectionId).toBe('number');
    });

    it('should auto-generate createdAt timestamp', async () => {
      const collection = createMockCollection({ id: undefined, createdAt: undefined });
      delete collection.id;
      delete collection.createdAt;

      const collectionId = await addCollection(collection);
      const savedCollection = await getCollectionById(collectionId);

      expect(savedCollection.createdAt).toBeDefined();
      expect(savedCollection.createdAt).toBeInstanceOf(Date);
    });

    it('should save collection with all fields', async () => {
      const collection = {
        name: 'My Collection',
        icon: 'star',
        color: 'text-yellow-500',
        filters: {
          status: 'Reading',
          tags: ['ml', 'ai'],
          searchTerm: 'test'
        }
      };

      const collectionId = await addCollection(collection);
      const savedCollection = await getCollectionById(collectionId);

      expect(savedCollection.name).toBe('My Collection');
      expect(savedCollection.icon).toBe('star');
      expect(savedCollection.color).toBe('text-yellow-500');
      expect(savedCollection.filters).toEqual({
        status: 'Reading',
        tags: ['ml', 'ai'],
        searchTerm: 'test'
      });
    });

    it('should initialize default icon and color if not provided', async () => {
      const collection = {
        name: 'Simple Collection',
        filters: { status: null, tags: [], searchTerm: '' }
      };

      const collectionId = await addCollection(collection);
      const savedCollection = await getCollectionById(collectionId);

      expect(savedCollection.icon).toBeDefined();
      expect(savedCollection.color).toBeDefined();
    });
  });

  describe('getAllCollections', () => {
    it('should return empty array when no collections exist', async () => {
      const collections = await getAllCollections();

      expect(collections).toEqual([]);
    });

    it('should return all collections from database', async () => {
      const collection1 = createMockCollection({ id: undefined, name: 'Collection 1' });
      const collection2 = createMockCollection({ id: undefined, name: 'Collection 2' });
      delete collection1.id;
      delete collection2.id;

      await addCollection(collection1);
      await addCollection(collection2);

      const collections = await getAllCollections();

      expect(collections).toHaveLength(2);
      expect(collections.map(c => c.name)).toContain('Collection 1');
      expect(collections.map(c => c.name)).toContain('Collection 2');
    });

    it('should sort collections by createdAt (newest first)', async () => {
      const oldCollection = createMockCollection({ 
        id: undefined, 
        name: 'Old',
        createdAt: new Date('2024-01-01')
      });
      const newCollection = createMockCollection({ 
        id: undefined, 
        name: 'New',
        createdAt: new Date('2024-01-10')
      });
      delete oldCollection.id;
      delete newCollection.id;

      await addCollection(oldCollection);
      await addCollection(newCollection);

      const collections = await getAllCollections();

      expect(collections[0].name).toBe('New');
      expect(collections[1].name).toBe('Old');
    });
  });

  describe('getCollectionById', () => {
    it('should return collection by id', async () => {
      const collection = createMockCollection({ id: undefined, name: 'Specific Collection' });
      delete collection.id;

      const collectionId = await addCollection(collection);
      const retrievedCollection = await getCollectionById(collectionId);

      expect(retrievedCollection.name).toBe('Specific Collection');
      expect(retrievedCollection.id).toBe(collectionId);
    });

    it('should return undefined for non-existent id', async () => {
      const collection = await getCollectionById(99999);

      expect(collection).toBeUndefined();
    });
  });

  describe('updateCollection', () => {
    it('should update existing collection', async () => {
      const collection = createMockCollection({ id: undefined, name: 'Original Name' });
      delete collection.id;

      const collectionId = await addCollection(collection);
      await updateCollection(collectionId, { name: 'Updated Name' });

      const updatedCollection = await getCollectionById(collectionId);

      expect(updatedCollection.name).toBe('Updated Name');
    });

    it('should preserve fields not being updated', async () => {
      const collection = createMockCollection({ 
        id: undefined,
        name: 'Original',
        icon: 'star',
        color: 'text-yellow-500'
      });
      delete collection.id;

      const collectionId = await addCollection(collection);
      await updateCollection(collectionId, { name: 'Updated' });

      const updatedCollection = await getCollectionById(collectionId);

      expect(updatedCollection.name).toBe('Updated');
      expect(updatedCollection.icon).toBe('star');
      expect(updatedCollection.color).toBe('text-yellow-500');
    });

    it('should update filters correctly', async () => {
      const collection = createMockCollection({ 
        id: undefined,
        filters: { status: 'Reading', tags: ['ml'], searchTerm: '' }
      });
      delete collection.id;

      const collectionId = await addCollection(collection);
      await updateCollection(collectionId, { 
        filters: { status: 'Finished', tags: ['ai'], searchTerm: 'test' }
      });

      const updatedCollection = await getCollectionById(collectionId);

      expect(updatedCollection.filters).toEqual({
        status: 'Finished',
        tags: ['ai'],
        searchTerm: 'test'
      });
    });

    it('should reject update of non-existent collection', async () => {
      await expect(updateCollection(99999, { name: 'New Name' })).rejects.toThrow();
    });
  });

  describe('deleteCollection', () => {
    it('should delete existing collection', async () => {
      const collection = createMockCollection({ id: undefined });
      delete collection.id;

      const collectionId = await addCollection(collection);
      await deleteCollection(collectionId);

      const deletedCollection = await getCollectionById(collectionId);

      expect(deletedCollection).toBeUndefined();
    });

    it('should not throw when deleting non-existent collection', async () => {
      await expect(deleteCollection(99999)).resolves.not.toThrow();
    });

    it('should not affect other collections', async () => {
      const collection1 = createMockCollection({ id: undefined, name: 'Collection 1' });
      const collection2 = createMockCollection({ id: undefined, name: 'Collection 2' });
      delete collection1.id;
      delete collection2.id;

      const id1 = await addCollection(collection1);
      const id2 = await addCollection(collection2);

      await deleteCollection(id1);

      const collections = await getAllCollections();

      expect(collections).toHaveLength(1);
      expect(collections[0].id).toBe(id2);
    });
  });
});

