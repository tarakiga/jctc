'use client';

import { AlertTriangle, ExternalLink, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import {
  type DuplicateMatch,
  getSimilarityColorClass,
  formatMatchingFields,
} from '@/lib/hooks/useDuplication';

interface DuplicateDetectorProps {
  matches: DuplicateMatch[];
  onLinkCase?: (caseId: string) => void;
  onProceedAnyway?: () => void;
}

export default function DuplicateDetector({
  matches,
  onLinkCase,
  onProceedAnyway,
}: DuplicateDetectorProps) {
  if (matches.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold text-amber-900 mb-1">
            Potential Duplicate Cases Detected
          </h3>
          <p className="text-sm text-amber-700">
            {matches.length} similar {matches.length === 1 ? 'case' : 'cases'} found. Review below to avoid creating duplicates.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {matches.map((match) => {
          const colors = getSimilarityColorClass(match.similarity_score);
          return (
            <div
              key={match.case_id}
              className="bg-white border border-neutral-200 rounded-lg p-3 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      href={`/cases/${match.case_id}`}
                      className="font-medium text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                      target="_blank"
                    >
                      {match.case_number}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                    <span className="px-2 py-0.5 bg-neutral-100 text-neutral-600 text-xs rounded">
                      {match.status}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-900 font-medium truncate">
                    {match.title}
                  </p>
                  {match.description && (
                    <p className="text-xs text-neutral-600 mt-1 line-clamp-2">
                      {match.description}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`px-2 py-1 ${colors.bg} ${colors.text} text-xs font-semibold rounded border ${colors.border} whitespace-nowrap`}
                  >
                    {match.similarity_score}% match
                  </span>
                  {onLinkCase && (
                    <button
                      onClick={() => onLinkCase(match.case_id)}
                      className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded flex items-center gap-1 transition-colors"
                    >
                      <LinkIcon className="w-3 h-3" />
                      Link
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-neutral-500 pt-2 border-t border-neutral-100">
                <span>Reported: {format(new Date(match.date_reported), 'PP')}</span>
                <span>•</span>
                <span>Matching: {formatMatchingFields(match.matching_fields)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {onProceedAnyway && (
        <div className="mt-4 pt-4 border-t border-amber-200">
          <p className="text-xs text-amber-700 mb-2">
            If this is genuinely a new case, you can proceed with creating it.
          </p>
          <button
            onClick={onProceedAnyway}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Proceed with New Case
          </button>
        </div>
      )}
    </div>
  );
}
