import React from 'react';
import './EmptyState.css';

const EmptyState = ({ title = 'No data available', description, actionLabel, onAction, actionDisabled = false }) => (
	<div className="empty-state">
		<h3>{title}</h3>
		{description && <p>{description}</p>}
		{actionLabel && onAction && (
			<button type="button" onClick={onAction} disabled={actionDisabled}>
				{actionLabel}
			</button>
		)}
	</div>
);

export default EmptyState;
