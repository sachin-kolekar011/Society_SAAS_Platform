import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { complaintsApi } from '../api/complaints.api';
import Button from '../../../components/ui/Button';

export default function RaiseComplaintPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ categoryId: '', description: '', priority: '' });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    complaintsApi.getCategories().then((res) => setCategories(res.data.data));
  }, []);

  // AI-assisted triage (Phase: new features) -- suggests a category as the
  // resident types, debounced so it doesn't fire on every keystroke. This
  // NEVER auto-fills the form; it only surfaces a suggestion the resident
  // can tap to accept, since a wrong silent auto-fill would be worse than
  // no suggestion at all.
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (form.description.length < 15) {
      setSuggestion(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await complaintsApi.suggestTriage(form.description);
        if (res.data.data.suggestedCategoryId) setSuggestion(res.data.data);
      } catch {
        // Suggestion failing silently is correct here -- it's a nice-to-have,
        // never something that should block or interrupt filling the form.
      }
    }, 600);
    return () => clearTimeout(debounceRef.current);
  }, [form.description]);

  const applySuggestion = () => {
    setForm({ ...form, categoryId: suggestion.suggestedCategoryId, priority: suggestion.suggestedPriority });
    setSuggestion(null);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    setPhoto(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('categoryId', form.categoryId);
      formData.append('description', form.description);
      if (photo) formData.append('photo', photo);
      const res = await complaintsApi.create(formData);
      navigate(`/complaints/${res.data.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not submit complaint. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">Raise a complaint</h1>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Category</label>
          <select
            required
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-900"
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          >
            <option value="">Select a category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Description</label>
          <textarea
            required
            rows={4}
            minLength={10}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-900"
            placeholder="Describe the issue..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          {suggestion && (
            <button
              type="button"
              onClick={applySuggestion}
              className="mt-2 text-xs px-2 py-1 rounded-md border border-[var(--tenant-accent)] text-[var(--tenant-accent)]"
            >
              💡 Suggested: {suggestion.suggestedCategoryName} · {suggestion.suggestedPriority} priority — tap to apply
            </button>
          )}
        </div>

        <div className="mb-6">
          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Photo (optional)</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="text-sm" />
          {/* Filename shown as text, not just a thumbnail -- Phase 8 §5 accessibility note */}
          {photo && <p className="text-xs text-gray-500 mt-1">{photo.name}</p>}
          {photoPreview && <img src={photoPreview} alt="Preview" className="mt-2 w-32 h-32 object-cover rounded-lg" />}
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        <Button type="submit" isLoading={isLoading}>Submit complaint</Button>
      </form>
    </div>
  );
}
