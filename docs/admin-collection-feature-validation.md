# Admin Collection Feature Validation

This branch closes the gap where collections could point their featured release at a song that was not actually part of that collection.

## Changes

- The admin collection form now limits the featured-release selector to posts already assigned to that collection.
- Existing invalid selections are shown as invalid legacy values instead of silently disappearing.
- The backend now rejects create/update requests where `featuredReleaseSlug` does not belong to the target collection.

## Verification checklist

- Open a collection that already has assigned posts and confirm only those posts appear in the featured-release selector.
- Create or edit a collection with no assigned posts and confirm the selector is effectively unavailable until posts are assigned.
- Submit a crafted invalid request and confirm the API returns a `400` instead of saving a broken featured slug.
