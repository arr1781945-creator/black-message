import os
from social_core.backends.github import GithubOAuth2

class GithubOAuth2HTTPS(GithubOAuth2):
    REDIRECT_STATE = False

    def get_redirect_uri(self, state=None):
        return os.environ.get(
            'SOCIAL_AUTH_GITHUB_CALLBACK_URL',
            'https://black-message-production.up.railway.app/oauth/complete/github/'
        )

    def auth_complete_url(self):
        return self.get_redirect_uri()

    def auth_url(self):
        url = super().auth_url()
        import re
        url = re.sub(
            r'redirect_uri=http%3A',
            'redirect_uri=https%3A',
            url
        )
        return url
