import React from 'react';
import './MemoryCard.css';

const MemoryCard = ({ memory }) => {
  const { type, url, content, metadata } = memory;

  const renderContent = () => {
    // For text memories
    if (type === 'text' && content) {
      return (
        <div className="memory-text-content">
          <p>{content}</p>
        </div>
      );
    }

    // For URL memories with playback HTML
    if (metadata?.playbackHtml) {
      return (
        <div 
          className="memory-embed"
          dangerouslySetInnerHTML={{ __html: metadata.playbackHtml }}
        />
      );
    }

    // For URLs with preview images but no playback
    if (metadata?.previewUrl) {
      return (
        <div className="memory-preview">
          <img 
            src={metadata.previewUrl} 
            alt={metadata.title || 'Memory preview'} 
            className="preview-image"
          />
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

  return (
    <div className={`memory-card memory-type-${type}`}>
      {/* Title Section */}
      {metadata?.title && (
        <h3 className="memory-title">{metadata.title}</h3>
      )}

      {/* Main Content */}
      {renderContent()}

      {/* Description */}
      {metadata?.description && (
        <p className="memory-description">{metadata.description}</p>
      )}

      {/* Metadata Display */}
      <div className="memory-metadata">
        {metadata?.siteName && (
          <span className="memory-site">{metadata.siteName}</span>
        )}
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
  );
};

export default MemoryCard;
