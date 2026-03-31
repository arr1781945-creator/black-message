from social_core.backends.github import GithubOAuth2

class GithubOAuth2HTTPS(GithubOAuth2):
    def get_redirect_uri(self, state=None):
        uri = super().get_redirect_uri(state)
        return uri.replace('http://', 'https://')
