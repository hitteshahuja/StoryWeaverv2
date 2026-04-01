import { useState } from 'react';
import { useDbUser } from '../context/UserContext';
import { usersAPI } from '../lib/api';

export default function InitialSetupModal() {
  const { dbUser, loading, setDbUser } = useDbUser();
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If loading dbUser or user signed out, don't show
  if (loading || !dbUser) return null;
  // If user already has child details set, don't show
  if (dbUser.child_name) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!childName.trim() || !childAge) return;

    try {
      setIsSubmitting(true);
      const updatedUser = await usersAPI.updateProfile({
        child_name: childName.trim(),
        child_age: parseInt(childAge, 10),
      });
      // Update the user context so this modal closes automatically
      setDbUser(updatedUser);
    } catch (err) {
      console.error('Failed to update profile:', err);
      alert('There was an error saving your details. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-night-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-night-800 rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome to DreamWeaver!
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6 font-medium text-sm">
          Before we start generating amazing stories, please tell us a little about your child.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="childName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Character Name(s)
            </label>
            <input
              type="text"
              id="childName"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-night-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-dream-500 focus:border-transparent outline-none dark:text-white transition-all"
              placeholder="e.g. Emma and Leo, or Emma and Mr. Buttons"
              required
            />
            <p className="text-[10px] text-gray-400 dark:text-white/30 mt-1">Separate multiple names with "and" or commas</p>
          </div>

          <div>
            <label htmlFor="childAge" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Child's Age
            </label>
            <input
              type="number"
              id="childAge"
              min="1"
              max="18"
              value={childAge}
              onChange={(e) => setChildAge(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-night-900/50 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-dream-500 focus:border-transparent outline-none dark:text-white transition-all"
              placeholder="e.g. 5"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !childName.trim() || !childAge}
            className="w-full btn-primary py-3 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Get Started'}
          </button>
        </form>
      </div>
    </div>
  );
}
