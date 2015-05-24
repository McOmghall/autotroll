require "twitter"
require "twitter_oauth"
require "logger"

logger = Logger.new(STDOUT)

# Hax to bypass SSL verification
OpenSSL::SSL::VERIFY_PEER = OpenSSL::SSL::VERIFY_NONE

logger.info "Crawl start"

options_twitter = { 
  :consumer_key        => "rYh1wRySn0W9WqCFex6wwHtSs",
  :consumer_secret     => "qpvCHUiLvE3VTrOJk4EA4zQbLeXSUz1hnYSi8jCLf9XfwxZ279",
  :access_token        => "3294082702-gNDUsWmvYqoc4XnkAceNerSHKXkmH8TFzh1SUm4",
  :access_token_secret => "Wsh8gH6ZXlMUiw96shsapdMd8Q0jD4ccSylB8b07uSeDd"
}

# Twitter analysis galiza https://apps.twitter.com/app/8301917/permissions
client = Twitter::REST::Client.new options_twitter 

logger.info "Client configured #{client.to_s} as #{client.user.name}"

logger.info "Writing tweets in Galicia"

galiza = client.geo_search(:query => "Galiza")

logger.info "Galiza = #{galiza.inspect}"
logger.info "Galiza search #{galiza.to_h[:result][:places][0][:centroid].reverse.join(",")},200km"

results = {}

begin
  client.search("", :geocode => "#{galiza.to_h[:result][:places][0][:centroid].reverse.join(",")},200km").collect do |tweet|
    tweet.text.split.each do |word|
      results[word.downcase] ||= 0
      results[word.downcase] += 1
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

