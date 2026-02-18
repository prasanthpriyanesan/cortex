"""
Custom validators for Cortex application.

Provides reusable field validators for common patterns like stock symbols,
hex colors, and phone numbers. Can be used as mixins or standalone validators.
"""

import re
from pydantic import field_validator


class SymbolValidator:
    """Validator for stock symbols."""

    @field_validator("symbol", mode="before")
    @classmethod
    def validate_symbol(cls, v: str) -> str:
        """
        Validate stock symbol format.

        Requirements:
        - 1-5 characters
        - Uppercase letters and numbers only

        Args:
            v: Stock symbol string

        Returns:
            Uppercase symbol string

        Raises:
            ValueError: If symbol doesn't match required format
        """
        if not v:
            raise ValueError("Symbol cannot be empty")
        if len(v) > 5:
            raise ValueError("Symbol must be 1-5 characters")
        if not re.match(r"^[A-Z0-9]{1,5}$", v):
            raise ValueError("Symbol must contain only uppercase letters and numbers")
        return v.upper()


class ColorValidator:
    """Validator for hex color codes."""

    @field_validator("color", mode="before")
    @classmethod
    def validate_hex_color(cls, v: str | None) -> str | None:
        """
        Validate hex color format.

        Requirements:
        - Valid hex color in format #RRGGBB
        - Optional field (None is allowed)

        Args:
            v: Hex color string (e.g., "#6366f1")

        Returns:
            Validated hex color string or None

        Raises:
            ValueError: If color doesn't match hex format
        """
        if v is None:
            return v
        if not isinstance(v, str):
            raise ValueError("Color must be a string")
        if not re.match(r"^#[0-9A-Fa-f]{6}$", v):
            raise ValueError("Color must be valid hex format (#RRGGBB)")
        return v.lower()


class PhoneValidator:
    """Validator for phone numbers."""

    @field_validator("phone_number", mode="before")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        """
        Validate phone number format.

        Requirements:
        - Optional field (None is allowed)
        - International format: +1 country code optional, 10 digits
        - Accepts: 1234567890, +11234567890, +1-123-456-7890 (after normalization)

        Args:
            v: Phone number string

        Returns:
            Validated phone number or None

        Raises:
            ValueError: If phone doesn't match required format
        """
        if v is None:
            return v
        if not isinstance(v, str):
            raise ValueError("Phone number must be a string")
        # Remove common formatting characters
        normalized = re.sub(r"[\s\-\(\)\.]+", "", v)
        if not re.match(r"^\+?1?\d{10}$", normalized):
            raise ValueError("Phone must be in valid format (10 digits, optional +1 prefix)")
        return normalized


class UsernameValidator:
    """Validator for usernames."""

    @field_validator("username", mode="before")
    @classmethod
    def validate_username(cls, v: str) -> str:
        """
        Validate username format.

        Requirements:
        - 3-50 characters
        - Alphanumeric characters and underscores only
        - Cannot start with a number

        Args:
            v: Username string

        Returns:
            Validated username

        Raises:
            ValueError: If username doesn't match requirements
        """
        if not v:
            raise ValueError("Username cannot be empty")
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters")
        if len(v) > 50:
            raise ValueError("Username must be no more than 50 characters")
        if not re.match(r"^[a-zA-Z0-9_]+$", v):
            raise ValueError("Username must contain only letters, numbers, and underscores")
        if v[0].isdigit():
            raise ValueError("Username cannot start with a number")
        return v.lower()


class IconValidator:
    """Validator for icon fields."""

    ALLOWED_ICONS = {"chart", "trending", "target", "alert", "flag", "star", "bell"}

    @field_validator("icon", mode="before")
    @classmethod
    def validate_icon(cls, v: str | None) -> str | None:
        """
        Validate icon name.

        Requirements:
        - Must be one of allowed icons
        - Optional field (None is allowed)

        Args:
            v: Icon name string

        Returns:
            Validated icon name or None

        Raises:
            ValueError: If icon is not in allowed list
        """
        if v is None:
            return v
        if not isinstance(v, str):
            raise ValueError("Icon must be a string")
        if v not in cls.ALLOWED_ICONS:
            allowed = ", ".join(sorted(cls.ALLOWED_ICONS))
            raise ValueError(f"Icon must be one of: {allowed}")
        return v
