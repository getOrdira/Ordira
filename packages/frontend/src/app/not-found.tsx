// src/app/not-found.tsx
import Link from 'next/link';
import { ExclamationTriangleIcon, HomeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-yellow-400" />
            <h1 className="mt-4 text-3xl font-bold text-gray-900">404</h1>
            <h2 className="mt-2 text-lg font-medium text-gray-900">Page Not Found</h2>
            <p className="mt-2 text-sm text-gray-600">
              The page you're looking for doesn't exist or has been moved.
            </p>
            
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/"
                className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <HomeIcon className="w-4 h-4 mr-2" />
                Go Home
              </Link>
              <button
                onClick={() => window.history.back()}
                className="flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}