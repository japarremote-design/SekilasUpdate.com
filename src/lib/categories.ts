/**
 * Categories are stored in Firestore (collection "categories") so admin can
 * add new ones from the site without a code change. This file only holds:
 * - the default set used to seed Firestore the very first time it's empty
 *   (keeps all existing articles' category names working after migration)
 * - a small slugify helper for turning a category name into a doc id
 */
export const DEFAULT_CATEGORIES: string[] = [
  'Nasional',
  'Politik',
  'Daerah',
  'Ekonomi',
  'Pendidikan',
  'Hukum',
  'Olahraga',
  'Teknologi',
  'Kesehatan',
  'Opini',
];

export function slugifyCategory(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function seedCategoriesIfEmpty() {
  try {
    const snap = await getDocs(collection(db, 'categories'));
    if (!snap.empty) return;

    for (const name of DEFAULT_CATEGORIES) {
      const id = slugifyCategory(name);
      await setDoc(doc(db, 'categories', id), {
        id,
        name,
        isActive: true,
        createdAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error seeding categories to Firestore:', error);
  }
}
