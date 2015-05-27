require "twitter"
require "twitter_oauth"
require "logger"
require "./oauth_data"

logger = Logger.new(STDOUT)

# Hax to bypass SSL verification
OpenSSL::SSL::VERIFY_PEER = OpenSSL::SSL::VERIFY_NONE
options_twitter = OAuthData.options_twitter

logger.info "Crawl start"

# Twitter analysis galiza https://apps.twitter.com/app/8301917/permissions
client = Twitter::REST::Client.new options_twitter 

logger.info "Client configured #{client.to_s} as #{client.user.name}"

logger.info "Writing tweets in Galicia"

galiza = client.geo_search(:query => "Galiza")

logger.info "Galiza = #{galiza.inspect}"
logger.info "Galiza search #{galiza.to_h[:result][:places][0][:centroid].reverse.join(",")},200km"

class Integer
  N_BYTES = [42].pack('i').size
  N_BITS = N_BYTES * 16
  MAX = 2 ** (N_BITS - 2) - 1
  MIN = -MAX - 1
end

results = {}
max_id = Integer::MAX

begin
  for i in 0..15 do
    client.user_timeline("galiciabilingue", :count => 200, :max_id => max_id || Integer::MAX).collect do |tweet|
      logger.info "#{tweet.lang} > #{tweet.text}"
      max_id = tweet.id unless tweet.id > max_id
    end
  end

rescue Twitter::Error::TooManyRequests => error
  # NOTE: Your process could go to sleep for up to 15 minutes but if you
  # retry any sooner, it will almost certainly fail with the same exception.
  logger.warn "Twitter tyranny is throttling us. Will sleep for #{error.rate_limit.reset_in + 1}"
  logger.warn "Results till now tho #{results.sort_by { |_, count| count }.inspect}"
  sleep error.rate_limit.reset_in + 1
  retry
end


logger.info "Results: #{results.sort_by { |_, count| count }.inspect}"

logger.info "Crawl end"
