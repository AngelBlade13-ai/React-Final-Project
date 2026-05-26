"""Project-specific exceptions for the Song Catalog Import Assistant."""


class SongCatalogError(Exception):
    """Base exception for recoverable project errors."""


class InputFileError(SongCatalogError):
    """Raised when an expected input file cannot be read."""


class ValidationError(SongCatalogError):
    """Raised when input data fails validation."""


class WebsiteIntegrationError(SongCatalogError):
    """Raised when website-targeted merge or apply steps fail."""
