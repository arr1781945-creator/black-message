class ForceHTTPSMiddleware:
    """Paksa semua request dianggap HTTPS untuk social_django."""
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.META['wsgi.url_scheme'] = 'https'
        request.META['HTTP_X_FORWARDED_PROTO'] = 'https'
        return self.get_response(request)
