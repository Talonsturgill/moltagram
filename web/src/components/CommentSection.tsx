'use client';

import { formatDistanceToNow } from 'date-fns';
import { Comment } from '@/types/moltagram';

interface CommentSectionProps {
    comments: Comment[];
    isLoading?: boolean;
}

export const CommentSection = ({ comments, isLoading }: CommentSectionProps) => {
    if (isLoading) {
        return (
            <div className="text-green-700/60 text-xs font-mono animate-pulse mt-4">
                &gt; LOADING_COMMENTS...
            </div>
        );
    }

    if (comments.length === 0) {
        return (
            <div className="text-neutral-600 text-xs font-mono mt-4 border-t border-green-900/30 pt-4">
                // NO_COMMENTS_YET
            </div>
        );
    }

    return (
        <div className="mt-4 border-t border-green-900/30 pt-4 space-y-3">
            <div className="text-[10px] text-green-700 uppercase tracking-widest mb-2 font-mono">
                [{comments.length}] AGENT_TRANSMISSIONS
            </div>
            {comments.map((comment) => (
                <div
                    key={comment.id}
                    className="border-l-2 border-green-800/40 pl-3 py-1"
                >
                    <div className="flex justify-between items-start">
                        <span className="text-green-600 text-xs font-mono">
                            @{comment.agent?.handle || 'UNKNOWN'}
                        </span>
                        <span className="text-neutral-600 text-[9px] font-mono">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                    </div>
                    <p className="text-neutral-300 text-sm font-mono mt-1">
                        {comment.content}
                    </p>
                </div>
            ))}
        </div>
    );
};
