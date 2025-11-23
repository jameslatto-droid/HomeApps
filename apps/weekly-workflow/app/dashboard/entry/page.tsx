'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, AlertTriangle, Database, DollarSign } from 'lucide-react';

type EntryType = 'decision' | 'risk' | 'dataset' | 'financial';

export default function EntryPage() {
  const router = useRouter();
  const [entryType, setEntryType] = useState<EntryType>('decision');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const data: any = {
      type: entryType,
      title: formData.get('title'),
      description: formData.get('description'),
    };

    // Add type-specific fields
    switch (entryType) {
      case 'decision':
        data.status = formData.get('status');
        data.owner = formData.get('owner');
        data.impact = formData.get('impact');
        break;
      case 'risk':
        data.severity = formData.get('severity');
        data.likelihood = formData.get('likelihood');
        data.mitigation = formData.get('mitigation');
        data.owner = formData.get('owner');
        break;
      case 'dataset':
        data.source = formData.get('source');
        data.status = formData.get('status');
        data.owner = formData.get('owner');
        break;
      case 'financial':
        data.amount = parseFloat(formData.get('amount') as string);
        data.category = formData.get('category');
        data.status = formData.get('status');
        break;
    }

    try {
      const response = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to save entry');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError('Failed to save entry. Please try again.');
      setLoading(false);
    }
  };

  const entryTypes = [
    { value: 'decision', label: 'Decision', icon: FileText, color: 'blue' },
    { value: 'risk', label: 'Risk', icon: AlertTriangle, color: 'red' },
    { value: 'dataset', label: 'Dataset', icon: Database, color: 'green' },
    { value: 'financial', label: 'Financial', icon: DollarSign, color: 'yellow' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">New Entry</h1>
        <p className="text-muted-foreground">
          Add a new governance entry for this week
        </p>
      </div>

      {/* Entry Type Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {entryTypes.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.value}
              onClick={() => setEntryType(type.value as EntryType)}
              className={`p-4 rounded-lg border-2 transition-all ${
                entryType === type.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <Icon className={`w-6 h-6 mx-auto mb-2 ${
                entryType === type.value ? 'text-primary' : 'text-muted-foreground'
              }`} />
              <div className={`text-sm font-medium ${
                entryType === type.value ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {type.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Entry Form */}
      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 space-y-6">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Common Fields */}
        <div>
          <label className="block text-sm font-medium text-card-foreground mb-2">
            Title *
          </label>
          <input
            type="text"
            name="title"
            required
            className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Enter a descriptive title"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-card-foreground mb-2">
            Description *
          </label>
          <textarea
            name="description"
            required
            rows={4}
            className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            placeholder="Provide detailed information"
          />
        </div>

        {/* Type-specific Fields */}
        {entryType === 'decision' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">
                  Status
                </label>
                <select
                  name="status"
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select status</option>
                  <option value="Proposed">Proposed</option>
                  <option value="Approved">Approved</option>
                  <option value="Implemented">Implemented</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">
                  Owner
                </label>
                <input
                  type="text"
                  name="owner"
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Decision owner"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Impact
              </label>
              <select
                name="impact"
                className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select impact</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </>
        )}

        {entryType === 'risk' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">
                  Severity
                </label>
                <select
                  name="severity"
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select severity</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">
                  Likelihood
                </label>
                <select
                  name="likelihood"
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select likelihood</option>
                  <option value="Very Likely">Very Likely</option>
                  <option value="Likely">Likely</option>
                  <option value="Possible">Possible</option>
                  <option value="Unlikely">Unlikely</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Mitigation Strategy
              </label>
              <textarea
                name="mitigation"
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="Describe mitigation approach"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Owner
              </label>
              <input
                type="text"
                name="owner"
                className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Risk owner"
              />
            </div>
          </>
        )}

        {entryType === 'dataset' && (
          <>
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Data Source
              </label>
              <input
                type="text"
                name="source"
                className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g., Database, API, File"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">
                  Status
                </label>
                <select
                  name="status"
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select status</option>
                  <option value="Active">Active</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">
                  Owner
                </label>
                <input
                  type="text"
                  name="owner"
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Dataset owner"
                />
              </div>
            </div>
          </>
        )}

        {entryType === 'financial' && (
          <>
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Amount *
              </label>
              <input
                type="number"
                step="0.01"
                name="amount"
                required
                className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="0.00"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">
                  Category
                </label>
                <select
                  name="category"
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select category</option>
                  <option value="Revenue">Revenue</option>
                  <option value="Expense">Expense</option>
                  <option value="Investment">Investment</option>
                  <option value="Savings">Savings</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">
                  Status
                </label>
                <select
                  name="status"
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select status</option>
                  <option value="Planned">Planned</option>
                  <option value="Committed">Committed</option>
                  <option value="Actual">Actual</option>
                </select>
              </div>
            </div>
          </>
        )}

        {/* Submit Button */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Entry'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
