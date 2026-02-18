"""
Logging configuration for Cortex application.

Provides structured JSON logging with configurable log levels.
Uses python-json-logger for JSON formatting to support parsing and analysis.
"""

import logging
from pythonjsonlogger import jsonlogger


def setup_logging(debug: bool = False, log_level: str = "INFO") -> logging.Logger:
    """
    Configure structured JSON logging for the application.

    Args:
        debug: If True, sets log level to DEBUG. Overrides log_level parameter.
        log_level: Log level as string (INFO, WARNING, ERROR, DEBUG, CRITICAL).
                   Ignored if debug=True.

    Returns:
        Configured root logger instance.
    """
    # Get root logger
    root_logger = logging.getLogger()

    # Clear any existing handlers to avoid duplicates
    root_logger.handlers.clear()

    # Set log level
    if debug:
        root_logger.setLevel(logging.DEBUG)
    else:
        root_logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))

    # Create console handler with JSON formatter
    console_handler = logging.StreamHandler()
    json_formatter = jsonlogger.JsonFormatter(
        fmt="%(asctime)s %(levelname)s %(name)s %(message)s"
    )
    console_handler.setFormatter(json_formatter)

    # Add handler to root logger
    root_logger.addHandler(console_handler)

    return root_logger


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance for a specific module.

    Args:
        name: Module name, typically __name__.

    Returns:
        Logger instance for the module.
    """
    return logging.getLogger(name)
