# https://stackoverflow.com/questions/38916452/nltk-download-ssl-certificate-verify-failed

# nltk is a natural language toolkit, used by unstructured

# Source - https://stackoverflow.com/a
# Posted by fstang, modified by community. See post 'Timeline' for change history
# Retrieved 2025-11-20, License - CC BY-SA 4.0

import nltk
import ssl

try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    pass
else:
    ssl._create_default_https_context = _create_unverified_https_context

nltk.download()
