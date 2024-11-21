import React, { useEffect } from 'react';
import './MemoryCard.css';

const MemoryCard = ({ memory }) => {
  const { type, url, content, metadata } = memory;

  useEffect(() => {
    // Load Instagram embeds
    if (window.instgrm && metadata?.playbackHtml?.includes('instagram-media')) {
      window.instgrm.Embeds.process();
    }
    // Load Twitter embeds
    if (window.twttr && metadata?.playbackHtml?.includes('twitter-tweet')) {
      window.twttr.widgets.load();
    }
  }, [metadata?.playbackHtml]);

  const renderContent = () => {
    // For text memories
    if (type === 'text' && content) {
      return (
        <div className="memory-text-content">
          <p>{content}</p>
        </div>
      );
    }

    // For URLs with playback HTML
    if (metadata?.playbackHtml) {
      return (
        <div 
          className={`memory-embed memory-type-${type}`}
          dangerouslySetInnerHTML={{ __html: metadata.playbackHtml }}
        />
      );
    }

    // For URLs with preview images but no playback
    if (metadata?.previewUrl) {
      return (
        <div className="memory-preview">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <img 
              src={metadata.previewUrl} 
              alt={metadata.title || 'Memory preview'} 
              className="preview-image"
            />
          </a>
        </div>
      );
    }

    // Fallback for URLs without preview
    if (url) {
      return (
        <div className="memory-link">
          <a href={url} target="_blank" rel="noopener noreferrer">
            {metadata?.title || url}
          </a>
        </div>
      );
    }

    return null;
  };

  // Don't render empty memories
  if (!content && !url && !metadata?.playbackHtml && !metadata?.previewUrl) {
    return null;
  }

  return (
    <div className={`memory-card memory-type-${type}`}>
      {/* Title Section */}
      {metadata?.title && type !== 'text' && (
        <div className="memory-header">
          <h3 className="memory-title">
            {url ? (
              <a href={url} target="_blank" rel="noopener noreferrer">
                {metadata.title}
              </a>
            ) : (
              metadata.title
            )}
          </h3>
          {metadata?.siteName && (
            <span className="memory-site">{metadata.siteName}</span>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="memory-content">
        {renderContent()}
      </div>

      {/* Description */}
      {metadata?.description && type !== 'text' && (
        <div className="memory-description-container">
          <p className="memory-description">{metadata.description}</p>
        </div>
      )}

      {/* Footer Metadata */}
      <div className="memory-footer">
        {/* Author and Date */}
        <div className="memory-meta">
          {metadata?.author && (
            <span className="memory-author">By {metadata.author}</span>
          )}
          {metadata?.publishedDate && (
            <span className="memory-date">
              {new Date(metadata.publishedDate).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Tags */}
        {metadata?.tags && metadata.tags.length > 0 && (
          <div className="memory-tags">
            {metadata.tags.map((tag, index) => (
              <span key={index} className="memory-tag">#{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MemoryCard;
