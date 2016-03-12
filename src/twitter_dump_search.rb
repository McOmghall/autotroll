require "twitter"
require "twitter_oauth"
require_relative "logger_config"
require_relative "integer_extensions"

require "httplog" if (ENV["httplog"] == "true")

begin
  require_relative "oauth_data"
rescue LoadError
  module TwitterOAuthData
    # Twitter analysis galiza https://apps.twitter.com/app/8301917/permissions
    def TwitterOAuthData.options_twitter
      {   
        :consumer_key        => ENV['CONSUMER_KEY'],
        :consumer_secret     => ENV['CONSUMER_SECRET'],
        :access_token        => ENV['ACCESS_TOKEN'],
        :access_token_secret => ENV['ACCESS_TOKEN_SECRET']    
      }
    end
  end
end

class TwitterDumpSearch
  
  DEFAULT_OPTIONS = {
      :loops => 15,
      :min_time => Date.today.prev_year.to_time,
      :starting_id => Integer::MAX,
      :retweet => false
  }
  
  def initialize options_override = {}
    @logger = LoggerConfig.new
    @logger.debug "Client configured with #{TwitterOAuthData.options_twitter.keys}"
    @logger.debug "Initializing crawler start, provided options: #{options_override}"
    
    @client = Twitter::REST::Client.new TwitterOAuthData.options_twitter
    @logger.debug "Client configured #{@client.to_s} as #{@client.user.name}"

    @options = DEFAULT_OPTIONS.merge(options_override)
    
    @logger.debug "Client options #{@options.inspect}"
  end
  
  def dump_user_tweets user
    throw Exception.new("Required argument user string, to search for: given #{user}") unless user && !user.empty?
    i = 0 
    results = []
    min_date = @options[:min_time] + 100
    max_id = @options[:starting_id]
      
    handle_twitter_errors do
      while i < @options[:loops] && min_date > @options[:min_time]
        @logger.debug "Request with: #{min_date} > #{max_id}"
        results_to_add = @client.user_timeline(user, :count => 200, :max_id => max_id).collect do |tweet|
          @logger.debug "Tweet: #{tweet.lang} > #{tweet.user.screen_name} > #{tweet.created_at} > #{tweet.text}"
            
          max_id = tweet.id - 1 unless tweet.id > max_id
          min_date = tweet.created_at unless tweet.created_at > min_date
          
          begin
            tweet.retweet! if @options[:retweet]
          rescue Twitter::Error::AlreadyRetweeted
            @logger.warn "Already retweeted that tweet. Next!"
            next
          rescue Twitter::Error::NotFound
            @logger.warn "Tweet doesn't seem to exist, maybe deleted by user. Next!"
            next
          end
          
          tweet
        end
        
        break if results_to_add.nil? || results_to_add.empty?
        
        results += results_to_add
        
        i += 1
      end
    end
    
    @logger.debug "We've reached an empty stream, probably the limit of it. Crawl end"
    
    return results
  end
  
  def tweet_gz_hour
    utc_hour = Time.now.getutc
    official_hour = utc_hour.getlocal "+01:00"
    handle_twitter_errors do
      @client.update "Son as #{utc_hour.strftime "%H:%M:%S"} na Galiza, #{official_hour.strftime "%H:%M:%S"} pola hora oficial"
    end
  end
  
  def handle_twitter_errors &block
    begin
      yield
    rescue Twitter::Error::TooManyRequests => error
      # NOTE: Your process could go to sleep for up to 15 minutes but if you
      # retry any sooner, it will almost certainly fail with the same exception.
      @logger.warn "Twitter tyranny is throttling us. Will sleep for #{error.rate_limit.reset_in + 1} seconds"
      sleep error.rate_limit.reset_in + 1
      retry
    rescue Twitter::Error::ServiceUnavailable => error
      @logger.warn "Twitter, strangely enough, appears to be down. Will sleep for 1 minute"
      sleep 60
      retry
    end
  end
end
