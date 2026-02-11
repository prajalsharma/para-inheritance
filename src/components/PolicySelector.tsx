/**
 * Policy Selector Components
 *
 * Modern UI components for:
 * - PolicySelector: Policy template selection cards
 * - EnvironmentSelector: Beta/Prod environment toggle
 * - PolicyPreviewPanel: Policy summary preview
 *
 * Design: Clean fintech dashboard style with clear hierarchy
 */

import type { PolicyTemplateId } from '../types/permissions';
import { POLICY_TEMPLATES } from '../types/permissions';

interface PolicySelectorProps {
  selectedTemplate: PolicyTemplateId | null;
  onSelect: (templateId: PolicyTemplateId) => void;
}

export function PolicySelector({ selectedTemplate, onSelect }: PolicySelectorProps) {
  return (
    <div>
      <h3 className="text-base font-semibold text-slate-900 mb-1">Policy Template</h3>
      <p className="text-sm text-slate-500 mb-5">
        Choose a permission policy for your child's wallet.
      </p>

      <div className="grid gap-4">
        {POLICY_TEMPLATES.map((template) => {
          const isSelected = selectedTemplate === template.id;
          return (
            <button
              key={template.id}
              onClick={() => onSelect(template.id)}
              className={`relative w-full text-left p-5 rounded-xl border-2 transition-all duration-200 ${
                isSelected
                  ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {/* Selection indicator */}
              <div className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                isSelected
                  ? 'border-primary-500 bg-primary-500'
                  : 'border-slate-300 bg-white'
              }`}>
                {isSelected && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>

              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isSelected ? 'bg-primary-100' : 'bg-slate-100'
                }`}>
                  {template.id === 'base-only' ? (
                    <svg className={`w-6 h-6 ${isSelected ? 'text-primary-600' : 'text-slate-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  ) : (
                    <svg className={`w-6 h-6 ${isSelected ? 'text-primary-600' : 'text-slate-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  )}
                </div>

                <div className="flex-1 pr-6">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className={`font-semibold ${isSelected ? 'text-primary-900' : 'text-slate-900'}`}>
                      {template.name}
                    </h4>
                    {template.hasUsdLimit && template.usdLimit && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-700">
                        ${template.usdLimit} limit
                      </span>
                    )}
                  </div>
                  <p className={`text-sm mb-4 ${isSelected ? 'text-primary-700' : 'text-slate-600'}`}>
                    {template.description}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {template.features.map((feature, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
                          isSelected
                            ? 'bg-primary-100 text-primary-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Environment Selector Component
 */
interface EnvironmentSelectorProps {
  selectedEnvironment: 'beta' | 'production';
  onSelect: (env: 'beta' | 'production') => void;
}

export function EnvironmentSelector({ selectedEnvironment, onSelect }: EnvironmentSelectorProps) {
  return (
    <div>
      <h3 className="text-base font-semibold text-slate-900 mb-1">Environment</h3>
      <p className="text-sm text-slate-500 mb-5">
        Choose the Para environment for wallet creation.
      </p>

      <div className="grid grid-cols-2 gap-4">
        {[
          {
            id: 'beta' as const,
            label: 'Beta',
            description: 'Development & testing',
            hint: '50 user limit',
            color: 'warning',
          },
          {
            id: 'production' as const,
            label: 'Production',
            description: 'Live deployment',
            hint: 'Unlimited users',
            color: 'success',
          },
        ].map((env) => {
          const isSelected = selectedEnvironment === env.id;
          return (
            <button
              key={env.id}
              onClick={() => onSelect(env.id)}
              className={`relative p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                isSelected
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              {/* Selection dot */}
              <div className={`absolute top-3 right-3 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                isSelected ? 'border-primary-500 bg-primary-500' : 'border-slate-300'
              }`}>
                {isSelected && (
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>

              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mb-3 ${
                env.color === 'warning'
                  ? 'bg-warning-100 text-warning-700'
                  : 'bg-success-100 text-success-700'
              }`}>
                {env.label.toUpperCase()}
              </span>

              <h4 className={`font-medium mb-1 ${isSelected ? 'text-primary-900' : 'text-slate-900'}`}>
                {env.description}
              </h4>
              <p className="text-xs text-slate-500">{env.hint}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Policy Preview Panel Component
 */
interface PolicyPreviewPanelProps {
  policy: {
    templateName: string;
    environment: 'beta' | 'production';
    chain: string;
    usdLimit: number | null;
    merchantCount: number;
    blockedActions: string[];
  };
}

export function PolicyPreviewPanel({ policy }: PolicyPreviewPanelProps) {
  return (
    <div>
      <h3 className="text-base font-semibold text-slate-900 mb-4">Policy Preview</h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Template</span>
          <p className="mt-1 font-medium text-slate-900">{policy.templateName}</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Environment</span>
          <p className="mt-1 font-medium text-slate-900 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${policy.environment === 'beta' ? 'bg-warning-500' : 'bg-success-500'}`}></span>
            {policy.environment.toUpperCase()}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Network</span>
          <p className="mt-1 font-medium text-slate-900 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.077 13.308-5.077 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.88a3 3 0 00-4.242 0 1 1 0 01-1.415-1.415 5 5 0 017.072 0 1 1 0 01-1.415 1.415zM9 16a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            {policy.chain}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">USD Limit</span>
          <p className="mt-1 font-medium text-slate-900">
            {policy.usdLimit ? (
              <span className="text-warning-600">${policy.usdLimit}/tx</span>
            ) : (
              <span className="text-slate-500">No limit</span>
            )}
          </p>
        </div>
      </div>

      <div className="mt-4 bg-white rounded-lg border border-slate-200 p-4">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Blocked Actions</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {policy.blockedActions.map((action, idx) => (
            <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-danger-50 text-danger-700">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
              </svg>
              {action}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
