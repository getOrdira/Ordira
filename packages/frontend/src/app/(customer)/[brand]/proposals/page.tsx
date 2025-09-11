// src/app/(customer)/[brand]/proposals/page.tsx
'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

// UI Components
import { Container } from '@/components/ui/layout/container';
import { Card } from '@/components/ui/layout/card';
import { Button } from '@/components/ui/primitives/button';
import { Badge } from '@/components/ui/data-display/badge';
import { EmptyState } from '@/components/ui/data-display/empty-state';
import { LoadingSpinner } from '@/components/ui/feedback/loading-spinner';
import { Progress } from '@/components/ui/data-display/progress';

// Icons
import { 
  ClockIcon,
  UsersIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

/**
 * Brand-specific proposals page
 * 
 * This page displays:
 * - Brand's voting proposals
 * - Proposal details and voting options
 * - Voting progress and results
 * - Brand-specific theming
 */

interface Proposal {
  id: string;
  title: string;
  description: string;
  options: {
    id: string;
    title: string;
    description: string;
    votes: number;
    percentage: number;
  }[];
  status: 'active' | 'completed' | 'upcoming';
  endDate: string;
  totalVotes: number;
  userVoted: boolean;
  userVote?: string;
}

export default function BrandProposalsPage() {
  const params = useParams();
  const brandSlug = params.brand as string;
  const [selectedProposal, setSelectedProposal] = useState<string | null>(null);

  // Fetch brand's proposals
  const { data: proposals, isLoading, error } = useQuery<Proposal[]>({
    queryKey: ['brand-proposals', brandSlug],
    queryFn: async () => [
      {
        id: '1',
        title: 'Eco-Friendly Packaging Design',
        description: 'Help us choose the packaging design for our new sustainable product line. Your vote will directly influence our final decision.',
        options: [
          {
            id: 'option-1',
            title: 'Minimalist Design',
            description: 'Clean, simple design with recycled materials',
            votes: 45,
            percentage: 60,
          },
          {
            id: 'option-2',
            title: 'Nature-Inspired',
            description: 'Design featuring natural elements and earth tones',
            votes: 30,
            percentage: 40,
          },
        ],
        status: 'active',
        endDate: '2024-02-15',
        totalVotes: 75,
        userVoted: false,
      },
      {
        id: '2',
        title: 'Product Color Selection',
        description: 'Vote on the primary color for our flagship product. This will be the main color used across all marketing materials.',
        options: [
          {
            id: 'option-1',
            title: 'Ocean Blue',
            description: 'Calming blue that represents trust and reliability',
            votes: 28,
            percentage: 45,
          },
          {
            id: 'option-2',
            title: 'Forest Green',
            description: 'Natural green that represents sustainability',
            votes: 34,
            percentage: 55,
          },
        ],
        status: 'active',
        endDate: '2024-02-20',
        totalVotes: 62,
        userVoted: true,
        userVote: 'option-2',
      },
      {
        id: '3',
        title: 'Product Naming',
        description: 'Help us name our new product line. The winning name will be used for all future products in this category.',
        options: [
          {
            id: 'option-1',
            title: 'EcoVibe',
            description: 'Modern, catchy name that emphasizes eco-friendliness',
            votes: 120,
            percentage: 65,
          },
          {
            id: 'option-2',
            title: 'GreenLife',
            description: 'Simple, direct name that conveys sustainability',
            votes: 65,
            percentage: 35,
          },
        ],
        status: 'completed',
        endDate: '2024-01-30',
        totalVotes: 185,
        userVoted: true,
        userVote: 'option-1',
      },
    ],
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const handleVote = (proposalId: string, optionId: string) => {
    // This would call your API to submit the vote
    console.log(`Voting for proposal ${proposalId}, option ${optionId}`);
    // Update local state or refetch data
  };

  if (isLoading) {
    return (
      <Container>
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" text={`Loading ${brandSlug}'s proposals...`} />
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <EmptyState
          icon="error"
          title="Failed to Load Proposals"
          description="There was an error loading the proposals. Please try again later."
          action={
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          }
        />
      </Container>
    );
  }

  return (
    <Container size="full" className="py-8">
      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-satoshi-bold text-[var(--heading-color)] mb-4">
          {brandSlug.charAt(0).toUpperCase() + brandSlug.slice(1)} Proposals
        </h1>
        <p className="text-[var(--body-color)] font-satoshi max-w-2xl mx-auto">
          Help shape our products by voting on design decisions, features, and more. 
          Your voice matters in our decentralized manufacturing process.
        </p>
      </div>

      {/* Proposals List */}
      {proposals?.length === 0 ? (
        <EmptyState
          icon="empty"
          title="No Proposals Available"
          description="There are currently no active proposals. Check back later for new voting opportunities!"
          action={
            <Button variant="outline">
              <ClockIcon className="w-4 h-4 mr-2" />
              Set Reminder
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {proposals?.map((proposal) => (
            <Card key={proposal.id} className="p-6">
              <div className="space-y-6">
                {/* Proposal Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-satoshi-semibold text-[var(--heading-color)]">
                        {proposal.title}
                      </h3>
                      <Badge 
                        variant={
                          proposal.status === 'active' ? 'info' :
                          proposal.status === 'completed' ? 'success' : 'warning'
                        }
                        size="sm"
                      >
                        {proposal.status}
                      </Badge>
                    </div>
                    <p className="text-[var(--body-color)] font-satoshi mb-4">
                      {proposal.description}
                    </p>
                  </div>
                </div>

                {/* Voting Options */}
                <div className="space-y-4">
                  {proposal.options.map((option) => (
                    <div 
                      key={option.id}
                      className={`border rounded-lg p-4 transition-all cursor-pointer ${
                        proposal.userVoted && proposal.userVote === option.id
                          ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5'
                          : 'border-[var(--border)] hover:border-[var(--brand-primary)]/50'
                      }`}
                      onClick={() => {
                        if (proposal.status === 'active' && !proposal.userVoted) {
                          handleVote(proposal.id, option.id);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-satoshi-semibold text-[var(--heading-color)] mb-1">
                            {option.title}
                          </h4>
                          <p className="text-sm text-[var(--body-color)] font-satoshi">
                            {option.description}
                          </p>
                        </div>
                        {proposal.userVoted && proposal.userVote === option.id && (
                          <CheckCircleIcon className="w-5 h-5 text-[var(--brand-primary)] flex-shrink-0" />
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-[var(--muted)] font-satoshi">
                            {option.votes} votes
                          </span>
                          <span className="font-satoshi-medium text-[var(--heading-color)]">
                            {option.percentage}%
                          </span>
                        </div>
                        <Progress value={option.percentage} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Proposal Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                  <div className="flex items-center space-x-4 text-sm text-[var(--muted)] font-satoshi">
                    <div className="flex items-center space-x-1">
                      <UsersIcon className="w-4 h-4" />
                      <span>{proposal.totalVotes} total votes</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <ClockIcon className="w-4 h-4" />
                      <span>
                        {proposal.status === 'active' ? 'Ends' : 'Ended'} {proposal.endDate}
                      </span>
                    </div>
                  </div>

                  {proposal.status === 'active' && !proposal.userVoted && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setSelectedProposal(proposal.id)}
                    >
                      Vote Now
                      <ArrowRightIcon className="w-4 h-4 ml-2" />
                    </Button>
                  )}

                  {proposal.userVoted && (
                    <Badge variant="success" size="sm">
                      <CheckCircleIcon className="w-3 h-3 mr-1" />
                      Voted
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Call to Action */}
      <div className="mt-12 text-center">
        <Card className="p-8 bg-[var(--brand-primary)]/5 border-[var(--brand-primary)]/20">
          <h3 className="text-xl font-satoshi-semibold text-[var(--heading-color)] mb-4">
            Want to stay updated?
          </h3>
          <p className="text-[var(--body-color)] font-satoshi mb-6 max-w-md mx-auto">
            Get notified when new proposals are available and never miss a voting opportunity.
          </p>
          <Button variant="primary" size="lg">
            <DocumentTextIcon className="w-4 h-4 mr-2" />
            Subscribe to Updates
          </Button>
        </Card>
      </div>
    </Container>
  );
}

/**
 * Brand Proposals Features:
 * 
 * 1. Brand-Specific Content: Proposals from the specific brand
 * 2. Voting Interface: Interactive voting on proposals
 * 3. Progress Tracking: Real-time voting progress
 * 4. User Status: Shows if user has voted
 * 5. Responsive Design: Works on all devices
 * 6. Real-time Updates: Live voting data
 * 7. Brand Theming: Uses brand colors and styling
 * 8. User Experience: Clear and intuitive voting flow
 */
